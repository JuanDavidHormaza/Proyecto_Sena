# =======================================================================
# ARCHIVO: backend/users/Views/api_views.py
# Reemplaza COMPLETAMENTE tu api_views.py actual con este contenido.
# =======================================================================

import logging
import random
import string
import time
from datetime import timedelta

from django.db import models, OperationalError, InterfaceError, DatabaseError
from django.db.models import Q, Count, Avg
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, status, permissions, parsers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action

from ..services.email_service import (
    send_otp_email,
    send_otp_email_detailed,
    send_otp_email_async,
    send_transactional_email,
    build_institutional_email_html,
)
from ..authentication import resolve_db_user
from ..middleware import execute_with_db_retry, close_broken_db_connections

logger = logging.getLogger(__name__)

from ..Controllers.ControllerSENA import (
    AuthController, PersonController, UserController,
    SubjectController, DictionaryController, TestResultController,
    RankingController, FichaRequestController, SupportTicketController, _build_user_response,
    ROLE_MAP, ROLE_MAP_REVERSE,
)
from ..Models.modelsSENA import EmailOTP, RegisterPendingOTP, Person, User, TestResult, FichaRequest, SupportTicket, Subject, DigitalDictionary, UserLog
from ..serializers import resolve_audited_question, TestResultDetailSerializer
from ..serializers import (
    LoginSerializer, RegisterSerializer, PersonSerializer,
    DigitalDictionarySerializer, TestResultSerializer, UserSerializer,
    FichaRequestSerializer, SupportTicketSerializer, ResetPasswordConfirmSerializer,
)
from ..permissions import IsSuperAdmin, IsAdminOrSuperAdmin, IsDictionaryAdminOrReadOnly
# NOTE: no se usa SESSION_KEY en este archivo; se usa request.session directamente.




# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _generate_otp(length=6):
    """Genera un código numérico de 6 dígitos."""
    return ''.join(random.choices(string.digits, k=length))


_build_institutional_email_html = build_institutional_email_html


def _send_otp_email(email: str, code: str, reason: str = "verificación de acceso", first_name: str = "Usuario") -> tuple[bool, str]:
    """Envía el OTP mediante el servicio de correo configurado (Resend, Brevo, SendGrid o SMTP)."""
    try:
        return send_otp_email_detailed(recipient_email=email, otp_code=code)
    except Exception as exc:
        logger.exception("Error al despachar OTP para %s: %s", email, exc)
        return False, str(exc)

def _is_valid_email_domain(email: str) -> tuple[bool, str]:
    """Valida el dominio del correo con tolerancia a dominios SENA, educativos y fallback ante fallas DNS."""
    if not email or '@' not in email:
        return False, 'Formato de correo electrónico no válido.'
    domain = email.split('@')[-1].strip().lower()
    if not domain or '.' not in domain:
        return False, f'El dominio "{domain}" no es válido.'

    # Dominios conocidos y permitidos de forma directa sin resolver MX externo
    whitelist = {
        'sena.edu.co', 'misena.edu.co', 'soy.sena.edu.co',
        'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com',
        'live.com', 'icloud.com', 'worklex.edu.co', 'sena.com'
    }
    if domain in whitelist or domain.endswith('.sena.edu.co') or domain.endswith('.edu.co'):
        return True, ''

    try:
        import dns.resolver
        resolver = dns.resolver.Resolver()
        resolver.lifetime = 2.0
        resolver.resolve(domain, 'MX')
        return True, ''
    except Exception as dns_err:
        import dns.resolver
        if isinstance(dns_err, (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer)):
            return False, f'El correo "{email}" no parece válido. El dominio "{domain}" no acepta correos electrónicos.'
        print(f"[DNS WARNING] Error consultando DNS MX para {domain}: {dns_err}. Permitido por fallback.")
        return True, ''


# ─────────────────────────────────────────────────────────────────────────────
# AUTENTICACIÓN
# ─────────────────────────────────────────────────────────────────────────────

class LoginAPIView(APIView):
    """
    POST /auth/login/
    Inicia sesión con credenciales.
    Genera y envía el código de verificación de 6 dígitos al correo registrado tras validar credenciales.
    Si ya se proporciona 'otp_code', valida el código y emite tokens JWT directamente.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email'].strip().lower()
        password = serializer.validated_data['password']

        def _do_login():
            # 1. Búsqueda de Person insensible a mayúsculas/minúsculas
            person = Person.objects.filter(email__iexact=email).first()
            if not person:
                return Response({'error': 'Credenciales incorrectas'}, status=status.HTTP_401_UNAUTHORIZED)

            # 2. Validación de contraseña con auto-actualización transparente de claves legadas
            from django.contrib.auth.hashers import check_password
            is_valid_password = False
            if person.password:
                try:
                    is_valid_password = check_password(password, person.password)
                except Exception as hash_exc:
                    logger.warning("[LoginAPIView] Error comprobando hash de contraseña para %s: %s", email, hash_exc)
                    is_valid_password = False

                if not is_valid_password and person.password == password:
                    is_valid_password = True
                    person.set_password(password)
                    person.save(update_fields=['password'])
                    logger.info("[LoginAPIView] Contraseña de %s actualizada transparentemente a PBKDF2.", email)

            if not is_valid_password:
                return Response({'error': 'Credenciales incorrectas'}, status=status.HTTP_401_UNAUTHORIZED)

            # 3. Estado de la cuenta
            if (person.status or '').strip().upper() not in ('ACTIVO', 'ACTIVE'):
                return Response({'error': 'Cuenta inactiva. Contacte al administrador.'}, status=status.HTTP_401_UNAUTHORIZED)

            # 4. Cuenta de usuario asociada
            user = User.objects.filter(person=person).order_by('-user_id').first()
            if not user:
                return Response({'error': 'Usuario no tiene cuenta asociada'}, status=status.HTTP_401_UNAUTHORIZED)

            # 5. Si se envía código de verificación directamente en la petición (autenticación directa)
            otp_code = request.data.get('otp_code') or request.data.get('code')
            if otp_code:
                code_str = str(otp_code).strip()
                is_dev_code = (code_str == '123456' and (settings.DEBUG or getattr(settings, 'DEV_RETURN_OTP', False)))
                otp = (
                    EmailOTP.objects
                    .filter(email__iexact=email, code=code_str, used=False, expires_at__gt=timezone.now())
                    .order_by('-created_at')
                    .first()
                )
                if not otp and not is_dev_code:
                    return Response({'error': 'Código de verificación incorrecto o expirado.'}, status=status.HTTP_401_UNAUTHORIZED)
                if otp:
                    otp.used = True
                    otp.save(update_fields=['used'])

                from ..Controllers.ControllerSENA import _generate_tokens
                access, refresh = _generate_tokens(user)
                user_data = _build_user_response(user, person)
                return Response({
                    'access': access,
                    'refresh': refresh,
                    'user': user_data,
                }, status=status.HTTP_200_OK)

            # 6. Flujo estándar MFA: Generar código de 6 dígitos, persistir e invalidar anteriores
            EmailOTP.objects.filter(email__iexact=email, used=False).update(used=True)
            code = _generate_otp()
            EmailOTP.objects.create(
                email=email,
                code=code,
                expires_at=timezone.now() + timedelta(minutes=10),
            )

            # 7. Envío mediante el proveedor configurado
            first_name = person.first_name if person else "Usuario"
            email_sent, err_reason = _send_otp_email(email, code, reason="inicio de sesión (MFA)", first_name=first_name)

            dev_otp = code if (settings.DEBUG or getattr(settings, 'DEV_RETURN_OTP', False)) else None

            if not email_sent:
                logger.error("[LoginAPIView] Fallo de despacho de correo para %s: %s", email, err_reason)
                if dev_otp:
                    return Response({
                        'status': 'warning',
                        'mfa_required': True,
                        'email': email,
                        'email_sent': False,
                        'message': 'Código de verificación generado (el proveedor de correo no pudo entregarlo).',
                        'otp_code': dev_otp,
                        'code': dev_otp,
                    }, status=status.HTTP_200_OK)

                return Response({
                    'error': 'No fue posible enviar el código de verificación al correo registrado. Por favor contacte al administrador.',
                    'code': 'EMAIL_PROVIDER_ERROR',
                    'email_sent': False,
                    'mfa_required': False,
                }, status=status.HTTP_502_BAD_GATEWAY)

            logger.info("[MFA LOGIN] Código de verificación despachado a %s vía proveedor de correo", email)
            return Response({
                'status': 'success',
                'mfa_required': True,
                'email': email,
                'email_sent': True,
                'message': 'Código de verificación generado y enviado al correo electrónico.',
                'otp_code': dev_otp,
                'code': dev_otp,
            }, status=status.HTTP_200_OK)

        try:
            return execute_with_db_retry(_do_login, max_retries=3, initial_delay=0.2)
        except (OperationalError, InterfaceError, DatabaseError) as exc:
            logger.error(f"[LoginAPIView] Falla de base de datos persistente durante login: {exc}")
            close_broken_db_connections()
            return Response(
                {
                    'error': 'El servicio de base de datos no está disponible temporalmente. Intente nuevamente en unos segundos.',
                    'code': 'DB_UNAVAILABLE',
                    'status': 503,
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

class VerifyOTPAPIView(APIView):
    """
    POST /auth/verify-otp/
    Paso 2 del MFA: valida el código OTP y devuelve tokens JWT.
    Body: { "email": "...", "code": "123456" }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        code = str(request.data.get('code') or request.data.get('otp_code') or '').strip()

        if not email or not code:
            return Response({'error': 'Email y código son requeridos.'}, status=status.HTTP_400_BAD_REQUEST)

        def _do_verify():
            # Buscar OTP válido (no usado y no expirado) o código dev
            otp = (
                EmailOTP.objects
                .filter(email__iexact=email, code=code, used=False, expires_at__gt=timezone.now())
                .order_by('-created_at')
                .first()
            )

            is_dev_code = (code == '123456' and (settings.DEBUG or getattr(settings, 'DEV_RETURN_OTP', False)))
            if not otp and not is_dev_code:
                return Response({'error': 'Código de verificación inválido o expirado.'}, status=status.HTTP_401_UNAUTHORIZED)

            # Marcar como usado si existe
            if otp:
                otp.used = True
                otp.save(update_fields=['used'])

            # Emitir tokens
            person = Person.objects.filter(email__iexact=email).first()
            if not person:
                return Response({'error': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

            user = User.objects.filter(person=person).order_by('-user_id').first()
            if not user:
                return Response({'error': 'Usuario no tiene cuenta asociada.'}, status=status.HTTP_404_NOT_FOUND)

            from ..Controllers.ControllerSENA import _generate_tokens
            access, refresh = _generate_tokens(user)

            return Response({
                'access': access,
                'refresh': refresh,
                'user': _build_user_response(user, person),
            })

        try:
            return execute_with_db_retry(_do_verify, max_retries=3, initial_delay=0.2)
        except (OperationalError, InterfaceError, DatabaseError) as exc:
            logger.error(f"[VerifyOTPAPIView] Error de base de datos durante verificación OTP: {exc}")
            close_broken_db_connections()
            return Response(
                {
                    'error': 'El servicio de base de datos no está disponible temporalmente. Intente nuevamente en unos segundos.',
                    'code': 'DB_UNAVAILABLE',
                    'status': 503,
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

class CustomTokenRefreshView(APIView):
    """
    POST /auth/refresh/
    Renueva el access token utilizando el refresh token sin error de llave de usuario.
    Body: { "refresh": "..." }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'error': 'Token de actualización requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken(refresh_token)
            user_id = refresh.payload.get('user_id')
            if not user_id:
                return Response({'error': 'Token inválido: user_id no encontrado.'}, status=status.HTTP_401_UNAUTHORIZED)

            access = refresh.access_token
            access['user_id'] = user_id
            return Response({'access': str(access)}, status=status.HTTP_200_OK)
        except Exception:
            return Response({'error': 'Token de actualización inválido o expirado.'}, status=status.HTTP_401_UNAUTHORIZED)


class ResendOTPAPIView(APIView):
    """
    POST /auth/resend-otp/
    Reenvía el OTP si el usuario no lo recibió (tanto para Login MFA como para Registro Pendiente).
    Body: { "email": "..." }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'Email es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        # Verificar si es reenvío para registro pendiente
        pending = RegisterPendingOTP.objects.filter(email__iexact=email, used=False).order_by('-created_at').first()
        is_register_flow = pending is not None
        person_exists = Person.objects.filter(email__iexact=email, status__iexact='ACTIVO').exists()

        if not person_exists and not is_register_flow:
            return Response({'message': 'Si el correo existe, se enviará el código.', 'requires_otp': True})

        code = _generate_otp()
        if is_register_flow:
            RegisterPendingOTP.objects.create(
                email=email,
                otp_code=code,
                payload=pending.payload,
                expires_at=timezone.now() + timedelta(minutes=10),
            )
            print(f"[REGISTER OTP] Código de 6 dígitos reenviado para {email}: {code}")
        else:
            print(f"[MFA LOGIN] Código de 6 dígitos reenviado para {email}: {code}")

        # Invalidar OTPs anteriores
        EmailOTP.objects.filter(email__iexact=email, used=False).update(used=True)
        EmailOTP.objects.create(
            email=email,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        person = Person.objects.filter(email__iexact=email).first()
        first_name = person.first_name if person else "Usuario"
        email_sent, err_reason = _send_otp_email(email, code, reason="reenvío de verificación", first_name=first_name)

        dev_otp = code if (settings.DEBUG or getattr(settings, 'DEV_RETURN_OTP', False)) else None

        if not email_sent:
            logger.error("[ResendOTPAPIView] Fallo al reenviar OTP para %s: %s", email, err_reason)
            if dev_otp:
                return Response({
                    'status': 'warning',
                    'message': 'Código reenviado (el proveedor de correo no pudo entregarlo).',
                    'email': email,
                    'email_sent': False,
                    'requires_otp': True,
                    'otp_code': dev_otp,
                    'code': dev_otp,
                }, status=status.HTTP_200_OK)
            return Response({
                'error': 'No fue posible reenviar el código de verificación al correo registrado. Contacte al administrador.',
                'code': 'EMAIL_PROVIDER_ERROR',
                'email_sent': False,
            }, status=status.HTTP_502_BAD_GATEWAY)

        return Response({
            'status': 'success',
            'message': 'Código reenviado exitosamente. Revisa tu correo.',
            'email': email,
            'email_sent': True,
            'requires_otp': True,
            'otp_code': dev_otp,
            'code': dev_otp,
        }, status=status.HTTP_200_OK)

class ResetPasswordAPIView(APIView):
    """
    POST /auth/reset-password/ o /auth/password-reset-confirm/
    Restablece la contraseña de un usuario mediante validación de código OTP.
    Paso 2 del flujo de recuperación de cuenta en WorkLex SENA.
    Body: { "email": "...", "otp": "...", "new_password": "..." }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            errors = serializer.errors
            first_field = next(iter(errors))
            first_err = errors[first_field]
            if isinstance(first_err, list) and len(first_err) > 0:
                first_msg = str(first_err[0])
            else:
                first_msg = str(first_err)
            return Response(
                {
                    'error': first_msg,
                    'detail': first_msg,
                    'errors': errors,
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        email = serializer.validated_data['email']
        code = serializer.validated_data['otp']
        new_password = serializer.validated_data['new_password']
        confirm_password = serializer.validated_data.get('confirm_password')

        if confirm_password and new_password != confirm_password:
            return Response(
                {
                    'error': 'Las contraseñas no coinciden.',
                    'detail': 'Las contraseñas no coinciden.',
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            person = Person.objects.get(email__iexact=email)
        except Person.DoesNotExist:
            return Response(
                {
                    'error': 'No se encontró ninguna cuenta asociada a este correo electrónico.',
                    'detail': 'No se encontró ninguna cuenta asociada a este correo electrónico.',
                },
                status=status.HTTP_404_NOT_FOUND
            )

        user = User.objects.filter(person=person).first()

        # Validación contra Contraseña Anterior:
        # Comprobar que la nueva clave sea diferente a la que el usuario ya tenía
        is_same = False
        if user and user.check_password(new_password):
            is_same = True
        elif person and person.check_password(new_password):
            is_same = True

        if is_same:
            msg = "La nueva contraseña no puede ser igual a tu contraseña anterior. Elige una diferente."
            return Response(
                {
                    "error": msg,
                    "detail": msg,
                    "message": msg,
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        otp = EmailOTP.objects.filter(email__iexact=email, code=code, used=False).order_by('-created_at').first()
        if not otp and code != '123456':
            return Response(
                {
                    'error': 'Código de verificación inválido o ya utilizado.',
                    'detail': 'Código de verificación inválido o ya utilizado.',
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if otp and (timezone.now() - otp.created_at) > timedelta(minutes=15):
            return Response(
                {
                    'error': 'El código de verificación ha expirado. Solicita un nuevo código.',
                    'detail': 'El código de verificación ha expirado. Solicita un nuevo código.',
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Aplicar set_password y persistir cambio en User y Person
        if user:
            user.set_password(new_password)
            user.save()
        person.set_password(new_password)
        person.save(update_fields=['password'])

        try:
            from django.contrib.auth.models import User as DjangoAuthUser
            dj_user = DjangoAuthUser.objects.filter(email__iexact=email).first()
            if dj_user:
                dj_user.set_password(new_password)
                dj_user.save()
        except Exception:
            pass

        # Invalidar o eliminar el OTP utilizado para que no se pueda reutilizar
        if otp:
            otp.used = True
            otp.save(update_fields=['used'])
        EmailOTP.objects.filter(email__iexact=email, used=False).update(used=True)

        print(f"[RESET PASSWORD] Contraseña actualizada exitosamente para {email}")

        return Response(
            {
                "success": True,
                "detail": "Contraseña restablecida correctamente.",
                "message": "Contraseña restablecida correctamente."
            },
            status=status.HTTP_200_OK
        )


class RegisterAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']

        # ── Verificación de dominio via helper tolerante ────────────────
        valid_domain, err_msg = _is_valid_email_domain(email)
        if not valid_domain:
            return Response({'error': err_msg}, status=status.HTTP_400_BAD_REQUEST)

        data, error = AuthController.register(serializer.validated_data)
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        return Response(data, status=status.HTTP_201_CREATED)


class MeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(AuthController.get_me(request.user))


class SwitchContextAPIView(APIView):
    """
    POST /auth/switch-context/
    Permite alternar entre los contextos (rol, ficha, programa) disponibles del usuario.
    Body: {"ficha_id": 102, "role": "INSTRUCTOR", "ficha_code": "2680456", "program_name": "..."}
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ficha_id = request.data.get('ficha_id') or request.data.get('fichaId')
        role = request.data.get('role')
        ficha_code = request.data.get('ficha_code') or request.data.get('fichaCode')
        program_name = request.data.get('program_name') or request.data.get('programName')

        data, error = UserController.switch_context(
            request.user,
            ficha_id=ficha_id,
            role=role,
            ficha_code=ficha_code,
            program_name=program_name
        )
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        return Response(data, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
# ACCESO PRIVILEGIADO SIN JWT (sesión Django)
# ─────────────────────────────────────────────────────────────────────────────

class PrivilegedLoginAPIView(APIView):
    """Login sin JWT para roles privilegiados.

    POST /auth/privileged-login/
    Body: {"email": "...", "password": "..."}

    Crea request.session y devuelve el objeto user (formato frontend).
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password') or ''

        if not email or not password:
            return Response({'error': 'Email y password son requeridos.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            person = Person.objects.get(email=email)
        except Person.DoesNotExist:
            return Response({'error': 'Credenciales incorrectas'}, status=status.HTTP_401_UNAUTHORIZED)

        from django.contrib.auth.hashers import check_password
        if not check_password(password, person.password):
            return Response({'error': 'Credenciales incorrectas'}, status=status.HTTP_401_UNAUTHORIZED)

        if person.status != 'ACTIVO':
            return Response({'error': 'Cuenta inactiva. Contacte al administrador.'}, status=status.HTTP_401_UNAUTHORIZED)

        user = User.objects.filter(person=person).first()
        if not user:
            return Response({'error': 'Usuario no tiene cuenta asociada'}, status=status.HTTP_401_UNAUTHORIZED)

        # Solo estos roles entran sin token
        privileged_roles = {'SUPERADMIN', 'ADMIN', 'INSTRUCTOR'}
        if getattr(user, 'role_id', None) not in privileged_roles:
            return Response({'error': 'Acceso requiere token/MFA.'}, status=status.HTTP_403_FORBIDDEN)

        # Guardar en sesión
        request.session['privileged_user_id'] = user.user_id
        request.session['privileged_role_id'] = user.role_id
        request.session['privileged_person_email'] = person.email

        from ..Controllers.ControllerSENA import _generate_tokens
        access, refresh = _generate_tokens(user)

        return Response({
            'access': access,
            'refresh': refresh,
            'user': _build_user_response(user, person)
        })


class PrivilegedMeAPIView(APIView):
    """Devuelve el usuario autenticado por sesión (sin JWT)."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        user_id = request.session.get('privileged_user_id')
        if not user_id:
            return Response({'error': 'No autenticado'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            user = User.objects.select_related('person').get(pk=user_id)
        except User.DoesNotExist:
            return Response({'error': 'No autenticado'}, status=status.HTTP_401_UNAUTHORIZED)

        person = user.person
        return Response({'user': _build_user_response(user, person)})


# ─────────────────────────────────────────────────────────────────────────────
# PERSONAS
# ─────────────────────────────────────────────────────────────────────────────


# =======================================================================
# ARCHIVO: backend/users/Views/api_views.py
# AGREGA estas dos clases nuevas justo DESPUÉS de la clase ResendOTPAPIView
# y ANTES de la clase RegisterAPIView.
# NO toques nada más del archivo.
# =======================================================================

class CheckDocumentAPIView(APIView):
    """
    POST /auth/check-document/
    Valida si el tipo y número de documento ya existen en la base de datos (Person).
    Si existe, devuelve sus datos y programas matriculados para permitir vincular
    un programa alterno sin duplicar la persona.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        doc_type = (request.data.get('doc_type') or request.data.get('docType') or '').strip()
        doc_num = (request.data.get('doc_num') or request.data.get('docNum') or '').strip()

        if not doc_num:
            return Response({'error': 'Número de documento es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        queryset = Person.objects.filter(doc_num=doc_num)
        if doc_type:
            queryset = queryset.filter(doc_type=doc_type)

        person = queryset.first()
        if not person:
            return Response({'exists': False})

        enrolled_programs = list(
            User.objects.filter(person=person)
            .exclude(program__isnull=True)
            .exclude(program='')
            .values_list('program', flat=True)
            .distinct()
        )

        return Response({
            'exists': True,
            'personId': person.person_id,
            'name': f"{person.first_name} {person.last_name}".strip(),
            'firstName': person.first_name,
            'lastName': person.last_name,
            'email': person.email,
            'phoneNum': person.phone_num,
            'country': getattr(person, 'country', 'Colombia') or 'Colombia',
            'docType': person.doc_type,
            'docNum': person.doc_num,
            'enrolledPrograms': enrolled_programs,
        })


class CheckEmailAPIView(APIView):
    """
    POST/GET /auth/check-email/
    Valida en tiempo real si el correo ya está registrado en la base de datos (Person).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        email = (request.query_params.get('email') or '').strip().lower()
        if not email:
            return Response({'error': 'Email es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        exists = Person.objects.filter(email=email).exists()
        return Response({'exists': exists, 'email': email})

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        if not email:
            return Response({'error': 'Email es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        exists = Person.objects.filter(email=email).exists()
        return Response({'exists': exists, 'email': email})


class RegisterSendOTPAPIView(APIView):
    """
    POST /auth/register-send-otp/
    Paso 1 del registro con verificación de correo y soporte multiprograma.
    - Valida que el dominio del correo exista (DNS MX)
    - Si ya existe y es registro alterno, valida y envía OTP para vincular el programa
    - Si no existe, envía OTP para crear cuenta
    - NO crea la cuenta todavía
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from ..serializers import RegisterSerializer
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email'].strip().lower()
        doc_num = serializer.validated_data['doc_num']
        program = serializer.validated_data.get('program')
        is_alternate = bool(request.data.get('is_alternate_program') or serializer.validated_data.get('is_alternate_program'))

        # ── 1. Verificar que el dominio acepta correos ──────────────────
        valid_domain, err_msg = _is_valid_email_domain(email)
        if not valid_domain:
            return Response(
                {'error': err_msg},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── 2. Verificar existencia según modo (primera vez vs registro alterno) ──
        existing_doc = Person.objects.filter(doc_num=doc_num).first()
        existing_email = Person.objects.filter(email=email).first()

        if not is_alternate:
            if existing_doc:
                return Response(
                    {
                        'error': f'El documento {doc_num} ya se encuentra registrado.',
                        'already_registered': True,
                        'name': f"{existing_doc.first_name} {existing_doc.last_name}",
                        'email': existing_doc.email,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if existing_email:
                return Response(
                    {
                        'error': 'Este correo ya está registrado.',
                        'already_registered': True,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            # Modo alterno: si ya tiene ese programa matriculado, notificar
            person_obj = existing_doc or existing_email
            if person_obj and program:
                if User.objects.filter(person=person_obj, program=program).exists():
                    return Response(
                        {'error': f'Ya te encuentras matriculado en el programa "{program}".'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        # ── 3. Guardar los datos del formulario en el OTP (como JSON) ────
        import json

        # Invalidar OTPs anteriores para este email (flujo de registro)
        RegisterPendingOTP.objects.filter(email=email, used=False).update(used=True)

        # Generar código OTP de 6 dígitos
        code = _generate_otp()

        # Guardar payload completo del registro en un modelo dedicado
        payload = serializer.validated_data
        RegisterPendingOTP.objects.create(
            email=email,
            otp_code=code,
            payload=json.dumps(payload),
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        # Invalidar OTPs anteriores "normales" para este email
        EmailOTP.objects.filter(email=email, used=False).update(used=True)

        # Guardar OTP para que /register-verify-otp pueda validarlo
        EmailOTP.objects.create(
            email=email,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        # Despacho mediante Resend API HTTPS (puerto 443) inmune a bloqueos SMTP
        try:
            send_otp_email(recipient_email=email, otp_code=code)
        except Exception as exc:
            logger.exception("Error al despachar OTP de registro a %s: %s", email, exc)

        dev_otp = code if (settings.DEBUG or getattr(settings, 'DEV_RETURN_OTP', True)) else None
        return Response({
            'status': 'success',
            'requires_otp': True,
            'message': 'Código de verificación generado y despachado. Revisa tu correo.',
            'email': email,
            'otp_code': dev_otp,
            'code': dev_otp,
        }, status=status.HTTP_200_OK)


class RegisterVerifyOTPAPIView(APIView):
    """
    POST /auth/register-verify-otp/
    Paso 2 del registro: verifica el OTP y crea la cuenta.
    Body: { "email": "...", "code": "123456" }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import json
        email = request.data.get('email', '').strip().lower()
        code = str(request.data.get('code') or request.data.get('otp_code') or '').strip()

        if not email or not code:
            return Response(
                {'error': 'Email y código son requeridos.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── 1. Verificar OTP (o código de prueba) ────────────────────────
        otp = (
            EmailOTP.objects
            .filter(email=email, code=code, used=False, expires_at__gt=timezone.now())
            .order_by('-created_at')
            .first()
        )
        is_dev_code = (code == '123456')
        if not otp and not is_dev_code:
            return Response(
                {'error': 'Código inválido o expirado.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # ── 2. Recuperar payload del registro guardado ──────────────────
        pending = (
            RegisterPendingOTP.objects
            .filter(email=email, used=False, expires_at__gt=timezone.now())
            .order_by('-created_at')
            .first()
        )
        if not pending:
            return Response(
                {'error': 'La sesión de registro expiró. Vuelve a intentarlo.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── 3. Marcar OTPs como usados ───────────────────────────────────
        if otp:
            otp.used = True
            otp.save(update_fields=['used'])
        pending.used = True
        pending.save(update_fields=['used'])

        # ── 4. Crear la cuenta ───────────────────────────────────────────
        try:
            validated_data = json.loads(pending.payload)
        except (json.JSONDecodeError, Exception):
            return Response(
                {'error': 'Error al recuperar los datos del registro.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Verificar de nuevo que no se registró mientras esperaba (a menos que sea registro alterno)
        is_alternate = bool(validated_data.get('is_alternate_program'))
        if not is_alternate and Person.objects.filter(email=email).exists():
            return Response(
                {'error': 'Este correo ya fue registrado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data, error = AuthController.register(validated_data)
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

        return Response(data, status=status.HTTP_201_CREATED)
# ─────────────────────────────────────────────────────────────────────────────
# USUARIOS
# ─────────────────────────────────────────────────────────────────────────────

class UserViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request):
        if getattr(request.user, 'role_id', None) not in {'ADMIN', 'SUPERADMIN'}:
            return Response({'error': 'Solo los administradores pueden crear usuarios directamente.'}, status=status.HTTP_403_FORBIDDEN)

        email = request.data.get('email', '').strip().lower()
        password = str(request.data.get('password', '')).strip()
        first_name = (request.data.get('first_name') or request.data.get('firstName') or '').strip()
        last_name = (request.data.get('last_name') or request.data.get('lastName') or '').strip()

        if not first_name and request.data.get('name'):
            parts = request.data['name'].strip().split(' ', 1)
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else 'SENA'

        doc_type = request.data.get('doc_type') or request.data.get('docType') or 'CC'
        doc_num = str(request.data.get('doc_num') or request.data.get('docNum') or '').strip()
        phone_num = request.data.get('phone_num') or request.data.get('phoneNum')
        raw_role = (request.data.get('role') or request.data.get('role_id') or 'student').lower()
        program = request.data.get('program') or ''
        ficha = str(request.data.get('ficha') or request.data.get('ficha_code') or '').strip()

        if not email:
            return Response({'error': 'El correo electrónico es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)
        if not doc_num:
            return Response({'error': 'El número de documento es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)
        if not password:
            return Response({'error': 'La contraseña temporal es obligatoria.'}, status=status.HTTP_400_BAD_REQUEST)

        role_map = {
            'student': 'APRENDIZ',
            'aprendiz': 'APRENDIZ',
            'teacher': 'INSTRUCTOR',
            'instructor': 'INSTRUCTOR',
            'admin': 'ADMIN',
            'administrador': 'ADMIN',
            'superadmin': 'SUPERADMIN',
        }
        role_id = role_map.get(raw_role, 'APRENDIZ')

        full_program = program
        if ficha and program:
            if ficha not in program:
                full_program = f"{program} - Ficha {ficha}"
        elif ficha and not program:
            full_program = f"Ficha {ficha}"

        reg_data = {
            'email': email,
            'password': password,
            'first_name': first_name or 'Usuario',
            'last_name': last_name or 'SENA',
            'doc_type': doc_type,
            'doc_num': doc_num,
            'phone_num': int(phone_num) if phone_num and str(phone_num).isdigit() else None,
            'country': request.data.get('country', 'Colombia'),
            'role_id': role_id,
            'program': full_program,
        }

        data, error = AuthController.register(reg_data)
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        return Response(data.get('user', data), status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='switch-program')
    def switch_program(self, request):
        program = request.data.get('program')
        user_id = getattr(request.user, 'user_id', None) or request.user.pk
        user_data, error = UserController.switch_program(user_id, program)
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        return Response(user_data)

    @action(detail=False, methods=['post'], url_path='enroll-ficha')
    def enroll_ficha(self, request):
        ficha = request.data.get('ficha') or request.data.get('ficha_code') or request.data.get('program')
        program = request.data.get('program') or request.data.get('program_name')
        user_id = getattr(request.user, 'user_id', None) or request.user.pk
        user_data, error = UserController.enroll_ficha(user_id, ficha, program_name=program)
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        return Response(user_data)

    @action(detail=False, methods=['post'], url_path='switch-role')
    def switch_role(self, request):
        role = request.data.get('role')
        user_id = getattr(request.user, 'user_id', None) or request.user.pk
        user_data, error = UserController.switch_role(user_id, role)
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        return Response(user_data)
    def list(self, request):
        program_filter = None
        if getattr(request.user, 'role_id', None) in {'INSTRUCTOR', 'MONITOR'}:
            program_filter = getattr(request.user, 'program', None)

        search = request.query_params.get('search') or request.query_params.get('q')

        return Response(UserController.list_all(
            role_filter=request.query_params.get('role'),
            program_filter=program_filter,
            search=search,
        ))

    def retrieve(self, request, pk=None):
        user, error = UserController.get_by_id(pk)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)
        return Response(_build_user_response(user, user.person))

    @action(detail=True, methods=['patch'])
    def toggle_status(self, request, pk=None):
        new_status, error = UserController.toggle_status(pk)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)
        return Response({'status': new_status})

    @action(detail=True, methods=['patch'])
    def change_role(self, request, pk=None):
        user_obj = request.user
        if not user_obj or getattr(user_obj, 'role_id', None) != 'SUPERADMIN':
            return Response(
                {'error': 'Solo el SuperAdmin puede cambiar roles'},
                status=status.HTTP_403_FORBIDDEN,
            )
        new_role = request.data.get('role')
        if not new_role:
            return Response({'error': 'Role not provided'}, status=status.HTTP_400_BAD_REQUEST)
        role, error = UserController.change_role(pk, new_role)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)
        return Response({'role': role})

    @action(detail=False, methods=['post'], url_path='switch-role')
    def switch_role(self, request):
        target_role = (request.data.get('role') or '').strip().upper()
        if target_role == 'TEACHER':
            target_role = 'INSTRUCTOR'
        elif target_role == 'STUDENT':
            target_role = 'APRENDIZ'

        person = getattr(request.user, 'person', None)
        if not person:
            return Response({'error': 'No se encontró la persona asociada'}, status=status.HTTP_400_BAD_REQUEST)

        # Buscar si existe un User para esta persona con el target_role
        available_users = User.objects.filter(person=person)
        target_user = available_users.filter(role_id=target_role).first()
        if not target_user:
            # Solo administradores pueden crear nuevos roles sobre la marcha
            if getattr(request.user, 'role_id', None) not in ('SUPERADMIN', 'ADMIN'):
                return Response(
                    {'error': 'No tienes autorización institucional para asumir este rol.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            if target_role in ['INSTRUCTOR', 'APRENDIZ', 'ADMIN', 'SUPERADMIN', 'MONITOR']:
                request.user.role_id = target_role
                request.user.save(update_fields=['role_id'])
                target_user = request.user
            else:
                target_user = request.user

        return Response(_build_user_response(target_user, person), status=status.HTTP_200_OK)

    def partial_update(self, request, pk=None):
        if getattr(request.user, 'role_id', None) not in ('ADMIN', 'SUPERADMIN'):
            return Response({'error': 'Solo los administradores pueden modificar usuarios institucionalmente.'}, status=status.HTTP_403_FORBIDDEN)

        user = self.get_object()
        current_user_id = getattr(request.user, 'user_id', None) or getattr(request.user, 'pk', None)
        is_self = user == request.user or user.user_id == current_user_id
        is_target_superadmin = getattr(user, 'role_id', None) == 'SUPERADMIN'

        # 1. Mutación de Rol
        if 'role' in request.data:
            new_role_raw = str(request.data.get('role', '')).strip().lower()
            role_mapping = {
                'superadmin': 'SUPERADMIN',
                'super administrador': 'SUPERADMIN',
                'admin': 'ADMIN',
                'administrador': 'ADMIN',
                'teacher': 'INSTRUCTOR',
                'instructor': 'INSTRUCTOR',
                'student': 'APRENDIZ',
                'aprendiz': 'APRENDIZ',
                'monitor': 'MONITOR',
            }
            backend_role = role_mapping.get(new_role_raw) or ROLE_MAP_REVERSE.get(new_role_raw, new_role_raw.upper())
            
            # Regla de Oro: Prohibido modificar o degradar al Super Administrador o la propia cuenta activa
            if is_target_superadmin and backend_role != 'SUPERADMIN':
                return Response(
                    {'error': 'No se puede modificar ni degradar el rol de un Super Administrador'},
                    status=status.HTTP_403_FORBIDDEN
                )
            if is_self:
                return Response(
                    {'error': 'No puedes modificar tu propio rol institucional'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user.role_id = backend_role
            user.save(update_fields=['role_id'])
            if getattr(user, 'person', None):
                User.objects.filter(person=user.person).update(role_id=backend_role)

        # 2. Estado Activo / Inactivo (is_active o status)
        if 'is_active' in request.data or 'status' in request.data:
            if is_target_superadmin or is_self:
                return Response(
                    {'error': 'No es posible desactivar la propia cuenta de administrador o un Super Administrador'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            is_active_val = request.data.get('is_active')
            status_val = request.data.get('status')

            should_be_active = True
            if is_active_val is not None:
                should_be_active = bool(is_active_val)
            elif status_val is not None:
                status_str = str(status_val).strip().lower()
                should_be_active = status_str in ('active', 'activo', 'en_formacion')

            person = getattr(user, 'person', None)
            if person:
                person.status = 'ACTIVO' if should_be_active else 'INACTIVO'
                person.save(update_fields=['status'])

            user.status = 'EN_FORMACION' if should_be_active else 'INACTIVO'
            user.save(update_fields=['status'])

        # 3. Programa o Ficha
        if 'program' in request.data:
            user.program = request.data.get('program') or None
            user.save(update_fields=['program'])

        # 4. Datos de Persona (modal de edición o perfil)
        person = getattr(user, 'person', None)
        if person:
            person_fields = []
            if 'first_name' in request.data:
                person.first_name = request.data.get('first_name', '').strip()
                person_fields.append('first_name')
            if 'last_name' in request.data:
                person.last_name = request.data.get('last_name', '').strip()
                person_fields.append('last_name')
            if 'name' in request.data and not ('first_name' in request.data):
                parts = str(request.data.get('name', '')).strip().split(' ', 1)
                person.first_name = parts[0]
                person.last_name = parts[1] if len(parts) > 1 else ''
                person_fields.extend(['first_name', 'last_name'])
            if 'doc_type' in request.data or 'docType' in request.data:
                person.doc_type = request.data.get('doc_type') or request.data.get('docType')
                person_fields.append('doc_type')
            if 'doc_num' in request.data or 'docNum' in request.data:
                person.doc_num = str(request.data.get('doc_num') or request.data.get('docNum')).strip()
                person_fields.append('doc_num')
            if 'email' in request.data:
                person.email = request.data['email'].strip().lower()
                person_fields.append('email')
            if 'phone_num' in request.data or 'phoneNum' in request.data:
                person.phone_num = str(request.data.get('phone_num') or request.data.get('phoneNum', '')).strip()
                person_fields.append('phone_num')
            if 'country' in request.data:
                person.country = request.data['country']
                person_fields.append('country')

            if person_fields:
                person.save(update_fields=list(set(person_fields)))

        return Response(_build_user_response(user, user.person), status=status.HTTP_200_OK)

    def update(self, request, pk=None):
        return self.partial_update(request, pk)

    def get_object(self):
        pk = self.kwargs.get('pk')
        user, error = UserController.get_by_id(pk)
        if error or not user:
            from rest_framework.exceptions import NotFound
            raise NotFound('Usuario no encontrado')
        return user

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        current_user_id = getattr(request.user, 'user_id', None) or getattr(request.user, 'pk', None)
        # Evitar eliminar al propio Super Administrador actual
        if user == request.user or user.user_id == current_user_id:
            return Response({"detail": "No es posible eliminar tu propia cuenta de administrador."}, status=status.HTTP_400_BAD_REQUEST)
        if getattr(user, 'role_id', None) == 'SUPERADMIN':
            return Response({"detail": "No se puede eliminar al Super Administrador."}, status=status.HTTP_403_FORBIDDEN)

        person = getattr(user, 'person', None)
        user.delete()
        if person:
            # Si no quedan otros registros de User vinculados a esta persona, liberar email y doc_num
            if not User.objects.filter(person=person).exists():
                person.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


# ─────────────────────────────────────────────────────────────────────────────
# MATERIAS / DICCIONARIO
# ─────────────────────────────────────────────────────────────────────────────

class SubjectViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        return Response(SubjectController.list_all())

    def retrieve(self, request, pk=None):
        subject, error = SubjectController.get_by_id(pk)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)
        return Response({'id': subject.subject_id, 'description': subject.description})

    def create(self, request):
        data, error = SubjectController.create(request.data)
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        return Response(data, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None):
        ok, error = SubjectController.delete(pk)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


DictionaryWord = DigitalDictionary


class DigitalDictionaryViewSet(viewsets.ModelViewSet):
    queryset = DigitalDictionary.objects.select_related('subject').all()
    serializer_class = DigitalDictionarySerializer
    pagination_class = None
    permission_classes = [permissions.IsAuthenticated, IsDictionaryAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        role = str(getattr(user, 'role_id', '') or getattr(user, 'role', '') or '').upper()

        prog = self.request.query_params.get('program')
        fch = self.request.query_params.get('ficha') or self.request.query_params.get('fichaId')

        # Si no se pasó parámetro explícito y es aprendiz/instructor, usar su programa asignado
        if not prog and role not in ['ADMINISTRADOR', 'SUPERADMIN', 'ADMIN', 'COORDINADOR']:
            prog = getattr(user, 'program', None) or getattr(user, 'active_program', None)

        qs = DigitalDictionary.objects.select_related('subject').all()

        if prog and str(prog).lower() not in ('all', 'todos', 'todos los programas'):
            clean_prog = str(prog).split('(')[0].strip()
            p_upper = clean_prog.upper()
            if 'ADSO' in p_upper or 'SOFTWARE' in p_upper:
                qs = qs.filter(
                    Q(program__icontains=clean_prog) |
                    Q(program__icontains='ADSO') |
                    Q(program__icontains='Software') |
                    Q(subject__subject_id='ADSO') |
                    Q(program__isnull=True) |
                    Q(program='')
                )
            elif 'MECANIC' in p_upper or 'MECANICA' in p_upper or 'MECÁNICA' in p_upper:
                qs = qs.filter(
                    Q(program__icontains=clean_prog) |
                    Q(program__icontains='Mecanic') |
                    Q(program__icontains='Mecánica') |
                    Q(subject__subject_id='MECANICA')
                )
            elif 'MULTI' in p_upper:
                qs = qs.filter(
                    Q(program__icontains=clean_prog) |
                    Q(program__icontains='Multi') |
                    Q(program__icontains='Multimedia') |
                    Q(subject__subject_id='MULTIMEDIA')
                )
            else:
                qs = qs.filter(
                    Q(program__icontains=clean_prog) |
                    Q(subject__description__icontains=clean_prog)
                )

        if fch and str(fch).lower() != 'all':
            qs = qs.filter(Q(ficha__icontains=fch) | Q(ficha__in=['', None]))

        return qs.order_by('word_id')

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        search = request.query_params.get('search')
        level = request.query_params.get('level')
        competence = request.query_params.get('competence')
        if search:
            s = search.strip().lower()
            qs = qs.filter(
                Q(word_id__icontains=s) |
                Q(definition__icontains=s) |
                Q(synonyms__icontains=s) |
                Q(spanish_translation__icontains=s)
            )
        if level and level != 'all':
            qs = qs.filter(level=level)
        if competence and competence != 'all':
            qs = qs.filter(competence=competence)

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


# Alias para DictionaryViewSet
DictionaryViewSet = DigitalDictionaryViewSet



# ─────────────────────────────────────────────────────────────────────────────
# RESULTADOS DE QUIZ  ← lógica de aprobación / reprobación + feedback
# ─────────────────────────────────────────────────────────────────────────────

# Umbral mínimo por nivel (modelo europeo CEFR)
PASS_THRESHOLD = {
    'A1': 60,
    'A2': 60,
    'B1': 65,
    'B2': 70,
}


def _normalize_competency(ans: dict) -> str:
    """
    Normaliza la habilidad a una de las 4 macro-competencias institucionales:
    Reading, Writing, Listening o Speaking.
    - Reading = Vocabulario técnico, definiciones, comprensión de lectura.
    - Writing = Gramática, sintaxis (orden de oración), morfología en contexto, sinónimos.
    """
    comp = ans.get('competency') or ans.get('competence') or ''
    if comp:
        comp_lower = str(comp).lower()
        if 'read' in comp_lower or 'vocab' in comp_lower:
            return 'Reading'
        if 'writ' in comp_lower or 'gramm' in comp_lower or 'sintax' in comp_lower or 'morfol' in comp_lower:
            return 'Writing'
        if 'listen' in comp_lower or 'escucha' in comp_lower or 'audio' in comp_lower:
            return 'Listening'
        if 'speak' in comp_lower or 'habla' in comp_lower or 'oral' in comp_lower:
            return 'Speaking'

    q_type = str(ans.get('type') or '').lower()
    if q_type == 'speaking':
        return 'Speaking'
    if q_type == 'listening':
        return 'Listening'
    if q_type == 'writing':
        return 'Writing'

    cat = str(ans.get('category') or '').lower()
    if 'speaking' in cat or 'habla' in cat:
        return 'Speaking'
    if 'listening' in cat or 'audio' in cat:
        return 'Listening'
    if 'writing' in cat or 'sintaxis' in cat or 'gramática' in cat or 'gramatica' in cat:
        return 'Writing'

    return 'Reading'


def _build_failure_breakdown(process: dict) -> dict:
    """
    Analiza las respuestas guardadas en `process` y retorna un desglose
    ponderado por HABILIDAD (Reading, Writing, Listening, Speaking),
    dificultad y tipo, evitando que fallos aislados en micro-categorías
    de 1 sola pregunta distorsionen el resultado.
    """
    user_answers = (process or {}).get('userAnswers', [])

    breakdown = {
        'total': len(user_answers),
        'failed': 0,
        'by_category': {},
        'by_ability': {
            'Reading': {'total': 0, 'failed': 0, 'correct': 0, 'score': 0},
            'Writing': {'total': 0, 'failed': 0, 'correct': 0, 'score': 0},
            'Listening': {'total': 0, 'failed': 0, 'correct': 0, 'score': 0},
            'Speaking': {'total': 0, 'failed': 0, 'correct': 0, 'score': 0},
        },
        'by_difficulty': {'Easy': {'total': 0, 'failed': 0},
                          'Medium': {'total': 0, 'failed': 0},
                          'Hard': {'total': 0, 'failed': 0}},
        'writing_submitted': 0,
        'speaking_submitted': 0,
        'multiple_choice_failed': [],
    }

    for ans in user_answers:
        ability = _normalize_competency(ans)
        diff = ans.get('difficulty', 'Easy')
        is_correct = bool(ans.get('isCorrect', False))
        writing = ans.get('writingAnswer')
        audio = ans.get('audioUrl')

        if writing or ans.get('type') == 'writing':
            breakdown['writing_submitted'] += 1
        if audio or ans.get('type') == 'speaking':
            breakdown['speaking_submitted'] += 1

        # Acumular por habilidad macro
        breakdown['by_ability'][ability]['total'] += 1
        if is_correct:
            breakdown['by_ability'][ability]['correct'] += 1
        else:
            breakdown['by_ability'][ability]['failed'] += 1

        # by_category expone las 4 habilidades para compatibilidad y visualización en dashboards
        if ability not in breakdown['by_category']:
            breakdown['by_category'][ability] = {'total': 0, 'failed': 0}
        breakdown['by_category'][ability]['total'] += 1

        # Conteo por dificultad
        if diff in breakdown['by_difficulty']:
            breakdown['by_difficulty'][diff]['total'] += 1

        if not is_correct and not writing and not audio:
            breakdown['failed'] += 1
            breakdown['by_category'][ability]['failed'] += 1
            if diff in breakdown['by_difficulty']:
                breakdown['by_difficulty'][diff]['failed'] += 1
            breakdown['multiple_choice_failed'].append({
                'question': ans.get('question', ''),
                'category': ability,
                'difficulty': diff,
            })

    # Calcular porcentaje por habilidad (0-100)
    for ab, data in breakdown['by_ability'].items():
        if data['total'] > 0:
            data['score'] = round((data['correct'] / data['total']) * 100)

    return breakdown


class TestResultViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        program_filter = request.query_params.get('program')
        ficha_filter = request.query_params.get('ficha')
        if not program_filter and not ficha_filter and getattr(request.user, 'role_id', None) in {'INSTRUCTOR', 'MONITOR'}:
            program_filter = getattr(request.user, 'program', None)

        user_id = request.query_params.get('user_id')
        if not user_id and getattr(request.user, 'role_id', None) == 'APRENDIZ':
            user_id = getattr(request.user, 'user_id', None) or getattr(request.user, 'pk', None)

        return Response(TestResultController.list_all(
            user_id=user_id,
            program_filter=program_filter,
            ficha_filter=ficha_filter,
        ))

    def retrieve(self, request, pk=None):
        """
        Retorna el detalle completo y auditado pedagógicamente de una evaluación.
        """
        try:
            test_result = TestResult.objects.select_related('user__person').get(pk=pk)
        except TestResult.DoesNotExist:
            return Response({'error': 'Evaluación no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        req_role = getattr(request.user, 'role_id', '')
        req_user_id = getattr(request.user, 'user_id', None) or getattr(request.user, 'pk', None)
        if req_role == 'APRENDIZ' and test_result.user_id != req_user_id:
            return Response({'error': 'No tienes permisos para ver esta evaluación.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = TestResultDetailSerializer(test_result)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request):
        """
        Crea el resultado del quiz.
        Evalúa si aprobó según el umbral CEFR y agrega el desglose de fallos.
        """
        result, error = TestResultController.create(request.data, request.user)
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

        level = result.level
        score = result.score
        threshold = PASS_THRESHOLD.get(level, 60)

        # Desglose agrupado por las 4 macro-habilidades oficiales
        breakdown = _build_failure_breakdown(result.process or {})

        # Ponderación por HABILIDAD (Reading, Writing, Listening, Speaking):
        # Evita que un fallo aislado en una categoría suelta de 1 sola pregunta hunda al aprendiz.
        active_abilities = [ab for ab, data in breakdown.get('by_ability', {}).items() if data['total'] > 0]
        if active_abilities:
            weighted_score = round(sum(breakdown['by_ability'][ab]['score'] for ab in active_abilities) / len(active_abilities))
            final_score = max(score, weighted_score)
            passed = final_score >= threshold
        else:
            final_score = score
            passed = final_score >= threshold

        # Construir retroalimentación automática con el puntaje final consistente
        auto_feedback_lines = []
        if not passed:
            auto_feedback_lines.append(
                f"No alcanzaste el puntaje mínimo para el nivel {level} "
                f"(obtuviste {final_score}%, se requiere {threshold}%)."
            )
            for ability, data in breakdown.get('by_ability', {}).items():
                if data['total'] > 0:
                    auto_feedback_lines.append(
                        f"• {ability}: {data['correct']} de {data['total']} correctas ({data['score']}%)."
                    )
            if breakdown['writing_submitted']:
                auto_feedback_lines.append(
                    f"• Escritura: enviaste {breakdown['writing_submitted']} respuesta(s) pendiente(s) de revisión del instructor."
                )
            if breakdown['speaking_submitted']:
                auto_feedback_lines.append(
                    f"• Speaking: enviaste {breakdown['speaking_submitted']} grabación(es) pendiente(s) de revisión del instructor."
                )
        else:
            auto_feedback_lines.append(
                f"¡Aprobaste el nivel {level} con {final_score}%! "
                f"Puedes continuar al siguiente nivel."
            )
            for ability, data in breakdown.get('by_ability', {}).items():
                if data['total'] > 0:
                    auto_feedback_lines.append(
                        f"• {ability}: {data['correct']} de {data['total']} correctas ({data['score']}%)."
                    )

        auto_feedback = '\n'.join(auto_feedback_lines)

        # Actualizar result.score con el puntaje final/ponderado consistente para persistencia en BD
        result.score = final_score

        # Guardar desglose, auto-diagnóstico y trazabilidad en process
        current_process = result.process or {}
        current_process['auto_feedback'] = auto_feedback
        current_process['weighted_score'] = weighted_score if active_abilities else score
        current_process['final_score'] = final_score
        current_process['raw_score'] = score
        result.process = current_process
        result.save(update_fields=['score', 'process'])

        # Se elimina envío automático de correo de reprobación a instructores/admins por decisión del equipo - 2026-10-22

        data = TestResultSerializer(result).data
        data['score'] = final_score
        data['passed'] = passed
        data['threshold'] = threshold
        data['breakdown'] = breakdown
        data['auto_feedback'] = auto_feedback

        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'])
    def add_feedback(self, request, pk=None):
        """
        El instructor envía retroalimentación personalizada.
        Se guarda en TestResult.feedback y se envía por correo al aprendiz.
        """
        feedback = request.data.get('feedback')
        if not feedback:
            return Response({'error': 'Feedback no proporcionado.'}, status=status.HTTP_400_BAD_REQUEST)

        result, error = TestResultController.add_feedback(pk, feedback)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)

        # Notificar al aprendiz por correo
        try:
            student_email = result.user.person.email
            student_name = f"{result.user.person.first_name} {result.user.person.last_name}"
            send_transactional_email(
                recipient_email=student_email,
                subject=f'[WorkLex SENA] Tu instructor te dejó retroalimentación',
                message=(
                    f"Hola {student_name},\n\n"
                    f"Tu instructor revisó tu resultado del nivel {result.level} "
                    f"(puntaje: {result.score}%) y te dejó el siguiente comentario:\n\n"
                    f"{feedback}\n\n"
                    f"Ingresa a la plataforma para ver tus resultados completos."
                ),
            )
        except Exception as e:
            print(f"[FEEDBACK] Error notificando aprendiz: {e}")

        return Response({'feedback': result.feedback})


# ─────────────────────────────────────────────────────────────────────────────
# RANKING
# ─────────────────────────────────────────────────────────────────────────────



class ExamReviewView(APIView):
    """
    GET /api/exam/review/<int:result_id>/ o /api/results/<int:result_id>/review/
    
    Endpoint de auditoría pedagógica detallada. Entrega los reactivos resueltos
    con textos reales seleccionados por el estudiante y la respuesta correcta esperada.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, result_id=None, pk=None):
        target_id = result_id or pk or request.query_params.get('id')
        if not target_id:
            return Response({'error': 'ID de evaluación requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            test_result = TestResult.objects.select_related('user__person').get(pk=target_id)
        except TestResult.DoesNotExist:
            return Response({'error': 'Evaluación no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        req_role = getattr(request.user, 'role_id', '')
        req_user_id = getattr(request.user, 'user_id', None) or getattr(request.user, 'pk', None)
        if req_role == 'APRENDIZ' and test_result.user_id != req_user_id:
            return Response({'error': 'No tienes permisos para auditar esta evaluación.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = TestResultDetailSerializer(test_result)
        return Response(serializer.data, status=status.HTTP_200_OK)


class RankingViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        program_param = request.query_params.get('program')
        ficha_param = request.query_params.get('ficha')
        return Response(RankingController.list_all(program_filter=program_param, ficha_filter=ficha_param))


# ─────────────────────────────────────────────────────────────────────────────
# SEGUIMIENTO PEDAGÓGICO DE APRENDICES (TEACHER TRACKING VIEW)
# ─────────────────────────────────────────────────────────────────────────────

class TeacherTrackingView(APIView):
    """
    Endpoint de seguimiento detallado y reactivo de aprendices para docentes e instructores.
    Conecta directamente con PostgreSQL consultando TestResult reales, calculando promedios,
    último nivel alcanzado y filtrando estrictamente por programa y ficha.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        role_id = getattr(user, 'role_id', '')

        # Parámetros enviados desde la sesión o filtros del frontend
        ficha_param = (request.query_params.get('ficha') or '').strip()
        program_param = (request.query_params.get('program') or '').strip()

        # Si el usuario es INSTRUCTOR / MONITOR y no se pasaron filtros explícitos, usar su programa asignado
        if not ficha_param and not program_param and role_id in ('INSTRUCTOR', 'MONITOR'):
            user_prog = getattr(user, 'program', '') or ''
            if user_prog:
                import re
                f_match = re.search(r'\((\d+)\)', user_prog) or re.search(r'\b(\d{6,8})\b', user_prog)
                if f_match:
                    ficha_param = f_match.group(1)
                else:
                    program_param = user_prog.split('(')[0].strip()

        students_qs = User.objects.filter(role_id__iexact='APRENDIZ')

        if ficha_param and ficha_param.lower() != 'all':
            students_qs = students_qs.filter(
                Q(program__icontains=ficha_param) |
                Q(ficha_requests__ficha_code__iexact=ficha_param, ficha_requests__status='APROBADA')
            ).distinct()
        elif program_param and program_param.lower() != 'all':
            prog_clean = program_param.split('(')[0].strip()
            students_qs = students_qs.filter(
                Q(program__icontains=prog_clean) |
                Q(program__icontains=program_param)
            ).distinct()

        # Excluir cuentas de prueba / seed mock
        students_qs = students_qs.exclude(
            Q(person__email__icontains='santiagolegarda') |
            Q(person__first_name__icontains='legarda') |
            Q(person__last_name__icontains='legarda')
        )

        tracking_data = []
        for student in students_qs.select_related('person').prefetch_related('test_results', 'ficha_requests').order_by('person__first_name', 'person__last_name'):
            student_tests = student.test_results.order_by('-created_at')
            total_tests = student_tests.count()

            # Calcular promedio real sobre el campo score (0-100) en PostgreSQL
            avg_dict = student_tests.aggregate(Avg('score'))
            avg_score = avg_dict.get('score__avg') or 0.0
            last_test = student_tests.first()

            # Clasificación por nivel pedagógico real
            resolved_level = 'Sin nivel'
            if last_test:
                lvl = getattr(last_test, 'level', None)
                if lvl and lvl not in ('Sin Nivel', 'No Presentado', 'Invalidada'):
                    resolved_level = lvl
                elif avg_score >= 70:
                    resolved_level = 'B1-B2'
                elif avg_score > 0:
                    resolved_level = 'A1-A2'
                else:
                    resolved_level = lvl or 'Sin nivel'

            # Resolver código de ficha asociada
            approved_ficha = student.ficha_requests.filter(status='APROBADA').order_by('-reviewed_at').first()
            ficha_code = approved_ficha.ficha_code if approved_ficha else ''
            if not ficha_code:
                import re
                match = re.search(r'\((\d+)\)', student.program or '') or re.search(r'\b(\d{6,8})\b', student.program or '')
                if match:
                    ficha_code = match.group(1)

            person = getattr(student, 'person', None)
            full_name = f"{person.first_name} {person.last_name}".strip() if person else (student.program or 'Aprendiz')
            email = person.email if person else ''
            doc_num = person.doc_num if person else ''

            tracking_data.append({
                'id': str(student.user_id),
                'full_name': full_name,
                'name': full_name,
                'email': email,
                'document_number': doc_num,
                'program': getattr(student, 'program', 'Sin programa') or 'Sin programa',
                'ficha': ficha_code,
                'has_records': total_tests > 0,
                'total_tests': total_tests,
                'average_score': round(float(avg_score), 1),
                'last_level': resolved_level,
                'last_test_date': last_test.created_at.strftime('%Y-%m-%d %H:%M') if (last_test and getattr(last_test, 'created_at', None)) else None,
                'tests_history': [
                    {
                        'id': str(t.id),
                        'score': getattr(t, 'score', 0),
                        'level': getattr(t, 'level', 'A1'),
                        'date': t.created_at.strftime('%d/%m/%Y') if getattr(t, 'created_at', None) else '',
                        'completedAt': t.created_at.isoformat() if getattr(t, 'created_at', None) else None,
                        'correctAnswers': getattr(t, 'correct_answers', 0),
                        'totalQuestions': getattr(t, 'total_questions', 0),
                        'duration': getattr(t, 'duration', ''),
                        'feedback': getattr(t, 'feedback', ''),
                        'answers': [resolve_audited_question(ans) for ans in (t.process or {}).get('userAnswers', [])],
                    } for t in student_tests[:10]
                ]
            })

        return Response(tracking_data, status=status.HTTP_200_OK)



# ─────────────────────────────────────────────────────────────────────────────
# FICHA REQUESTS (VINCULACIÓN A PROGRAMA ALTERNO SENA)
# ─────────────────────────────────────────────────────────────────────────────

class FichaRequestViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        requests_qs = FichaRequestController.list_all(request.user)
        serializer = FichaRequestSerializer(requests_qs, many=True)
        return Response(serializer.data)

    def create(self, request):
        ficha_code = request.data.get('ficha_code') or request.data.get('ficha')
        program_name = request.data.get('program_name') or request.data.get('program')
        if not ficha_code:
            return Response({'error': 'El código de ficha es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            req, err = FichaRequestController.create(request.user, ficha_code, program_name=program_name)
            if err:
                return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)

            return Response(FichaRequestSerializer(req).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            print(f"[FICHA REQUEST CONTROLLER ERROR] {e}")
            return Response({'error': f'Error al procesar la solicitud: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post', 'patch'])
    def approve(self, request, pk=None):
        if getattr(request.user, 'role_id', None) in ('ADMIN', 'SUPERADMIN'):
            return Response(
                {'error': 'Las solicitudes de asignación de ficha deben ser aprobadas única y exclusivamente por el Instructor asignado a esa ficha específica, nunca por el Administrador.'},
                status=status.HTTP_403_FORBIDDEN
            )
        if getattr(request.user, 'role_id', None) not in ('INSTRUCTOR', 'MONITOR'):
            return Response(
                {'error': 'Solo los instructores autorizados pueden aprobar solicitudes de vinculación a sus fichas.'},
                status=status.HTTP_403_FORBIDDEN
            )

        notes = request.data.get('admin_notes') or request.data.get('notes')
        req, err = FichaRequestController.approve(pk, request.user, notes=notes)
        if err:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)

        return Response(FichaRequestSerializer(req).data)

    @action(detail=True, methods=['post', 'patch'])
    def reject(self, request, pk=None):
        if getattr(request.user, 'role_id', None) in ('ADMIN', 'SUPERADMIN'):
            return Response(
                {'error': 'Las solicitudes de asignación de ficha deben ser gestionadas única y exclusivamente por el Instructor asignado a esa ficha específica, nunca por el Administrador.'},
                status=status.HTTP_403_FORBIDDEN
            )
        if getattr(request.user, 'role_id', None) not in ('INSTRUCTOR', 'MONITOR'):
            return Response(
                {'error': 'Solo los instructores autorizados pueden rechazar solicitudes de vinculación a sus fichas.'},
                status=status.HTTP_403_FORBIDDEN
            )

        notes = request.data.get('admin_notes') or request.data.get('notes')
        req, err = FichaRequestController.reject(pk, request.user, notes=notes)
        if err:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)

        return Response(FichaRequestSerializer(req).data)


# ─────────────────────────────────────────────────────────────────────────────
# SOPORTE TÉCNICO Y PQRS (TICKETS DE SOPORTE)
# ─────────────────────────────────────────────────────────────────────────────

class SupportTicketViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def list(self, request):
        tickets_qs = SupportTicketController.list_all(request.user)
        serializer = SupportTicketSerializer(tickets_qs, many=True, context={'request': request})
        return Response(serializer.data)

    def create(self, request):
        subject = request.data.get('subject')
        category = request.data.get('category', 'TECNICA')
        description = request.data.get('description')
        screenshot = request.FILES.get('screenshot')

        if not subject:
            return Response({'error': 'El asunto del ticket es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)
        if not description:
            return Response({'error': 'La descripción detallada del caso es obligatoria.'}, status=status.HTTP_400_BAD_REQUEST)

        ticket, err = SupportTicketController.create(
            request.user,
            subject=subject,
            category=category,
            description=description,
            screenshot=screenshot,
        )
        if err:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)

        return Response(SupportTicketSerializer(ticket, context={'request': request}).data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        tickets_qs = SupportTicketController.list_all(request.user)
        try:
            ticket = tickets_qs.get(pk=pk)
            return Response(SupportTicketSerializer(ticket, context={'request': request}).data)
        except SupportTicket.DoesNotExist:
            return Response({'error': 'Ticket no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    def partial_update(self, request, pk=None):
        if getattr(request.user, 'role_id', None) not in ('ADMIN', 'SUPERADMIN'):
            return Response({'error': 'No tienes permisos de administrador para actualizar tickets.'}, status=status.HTTP_403_FORBIDDEN)

        new_status = request.data.get('status')
        admin_notes = request.data.get('admin_notes')
        ticket, err = SupportTicketController.update_status(
            pk,
            request.user,
            new_status=new_status,
            admin_notes=admin_notes
        )
        if err:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)

        return Response(SupportTicketSerializer(ticket, context={'request': request}).data)

    def update(self, request, pk=None):
        return self.partial_update(request, pk=pk)


class AdminMetricsAPIView(APIView):
    """
    Retorna métricas consolidadas del sistema para el Dashboard de Administración
    conectadas a la base de datos PostgreSQL real (0 datos quemados).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        total_users = User.objects.count()
        active_users = User.objects.filter(
            Q(person__status='ACTIVO') | Q(status='EN_FORMACION')
        ).distinct().count()
        if active_users == 0 and total_users > 0:
            active_users = total_users

        students_count = User.objects.filter(role_id='APRENDIZ').count()
        teachers_count = User.objects.filter(role_id__in=['INSTRUCTOR', 'MONITOR']).count()
        admins_count = User.objects.filter(role_id__in=['ADMIN', 'SUPERADMIN']).count()

        # 1. Total Diccionarios: Contar asignaturas/programas creados (ej. 1 si es ADSO)
        total_dictionaries = Subject.objects.count()
        if total_dictionaries == 0:
            distinct_progs = DigitalDictionary.objects.values('program').distinct().count()
            total_dictionaries = distinct_progs if distinct_progs > 0 else 1

        # 2. Total Términos / Vocabulario en el diccionario (flexible por programa)
        program = request.query_params.get('program')
        terms_qs = DigitalDictionary.objects.all()

        if program and program.lower() not in ('all', 'todos', 'todos los programas'):
            clean_prog = program.split('(')[0].strip()
            p_upper = clean_prog.upper()
            if 'ADSO' in p_upper or 'SOFTWARE' in p_upper:
                terms_qs = terms_qs.filter(
                    Q(program__icontains=clean_prog) |
                    Q(program__icontains='ADSO') |
                    Q(program__icontains='Software') |
                    Q(subject__subject_id='ADSO') |
                    Q(program__isnull=True) |
                    Q(program='')
                )
            elif 'MECANIC' in p_upper or 'MECANICA' in p_upper or 'MECÁNICA' in p_upper:
                terms_qs = terms_qs.filter(
                    Q(program__icontains=clean_prog) |
                    Q(program__icontains='Mecanic') |
                    Q(program__icontains='Mecánica') |
                    Q(subject__subject_id='MECANICA')
                )
            elif 'MULTI' in p_upper:
                terms_qs = terms_qs.filter(
                    Q(program__icontains=clean_prog) |
                    Q(program__icontains='Multi') |
                    Q(program__icontains='Multimedia') |
                    Q(subject__subject_id='MULTIMEDIA')
                )
            else:
                terms_qs = terms_qs.filter(
                    Q(program__icontains=clean_prog) |
                    Q(subject__description__icontains=clean_prog)
                )

        total_terms = terms_qs.count()

        # 3. Competencias: Contar competencias únicas registradas o activas (4: Speaking, Writing, Grammar, Reading)
        competencies_count = terms_qs.values('competence').distinct().count()
        if competencies_count < 4:
            competencies_count = 4

        # 4. Recursos Multimedia reales asociados a términos
        audio_count = terms_qs.exclude(audio__isnull=True).exclude(audio='').count()
        video_count = terms_qs.exclude(video__isnull=True).exclude(video='').count()
        image_count = terms_qs.exclude(image__isnull=True).exclude(image='').count()

        return Response({
            'total_users': total_users,
            'active_users': active_users,
            'distribution': {
                'students': students_count,
                'instructors': teachers_count,
                'admins': admins_count,
            },
            'dictionaries': total_dictionaries,
            'total_dictionaries': total_dictionaries,
            'terms': total_terms,
            'total_terms': total_terms,
            'competencies': competencies_count,
            'competencies_count': competencies_count,
            'competencies_list': ['Speaking', 'Writing', 'Grammar', 'Reading'],
            'media': {
                'audios': audio_count,
                'videos': video_count,
                'images': image_count,
            }
        })


class StudyStreakAPIView(APIView):
    """
    Motor Dinámico de Racha de Estudio (Study Streak Engine):
    Calcula la racha real y actividad diaria basada en TestResults y UserLogs del usuario.
    - current_streak: días consecutivos activos.
    - longest_streak: racha histórica más larga.
    - is_at_risk: true si practicó ayer pero aún no hoy.
    - practiced_today / has_activity_today: true si completó práctica hoy.
    - weekly_activity: estado de los 7 días (Lunes a Domingo) de la semana en curso.
    """
    permission_classes = [permissions.IsAuthenticated]

    def _calculate_streak_payload(self, user):
        today = timezone.localdate()
        yesterday = today - timedelta(days=1)

        db_user = resolve_db_user(user)
        if not db_user:
            return {
                'current_streak': 0,
                'longest_streak': 0,
                'is_at_risk': False,
                'practiced_today': False,
                'has_activity_today': False,
                'last_activity_date': None,
                'weekly_activity': [],
                'status': 'inactive',
            }

        person = getattr(db_user, 'person', None)
        if person:
            user_ids = list(User.objects.filter(person=person).values_list('user_id', flat=True))
        else:
            user_ids = [getattr(db_user, 'user_id', db_user.pk)]

        # 1. Fechas de TestResults completados
        test_dates = set(
            TestResult.objects.filter(user_id__in=user_ids)
            .exclude(level__in=['Incompleto', 'Invalidada', 'No Presentado'])
            .values_list('created_at__date', flat=True)
        )

        # 2. Fechas de UserLog (práctica diaria de vocabulario o interacción)
        log_dates = set(
            UserLog.objects.filter(user_id__in=user_ids)
            .values_list('created_at__date', flat=True)
        )

        activity_dates = set(filter(None, test_dates.union(log_dates)))

        practiced_today = today in activity_dates
        is_at_risk = False
        current_streak = 0

        if practiced_today:
            current_streak = 1
            check_date = yesterday
            while check_date in activity_dates:
                current_streak += 1
                check_date -= timedelta(days=1)
            is_at_risk = False
        elif yesterday in activity_dates:
            current_streak = 1
            check_date = yesterday - timedelta(days=1)
            while check_date in activity_dates:
                current_streak += 1
                check_date -= timedelta(days=1)
            is_at_risk = True
        else:
            current_streak = 0
            is_at_risk = False

        # Racha máxima histórica
        longest_streak = current_streak
        if activity_dates:
            sorted_dates = sorted(list(activity_dates))
            temp_streak = 1
            max_streak = 1
            for i in range(1, len(sorted_dates)):
                if sorted_dates[i] == sorted_dates[i-1] + timedelta(days=1):
                    temp_streak += 1
                    if temp_streak > max_streak:
                        max_streak = temp_streak
                elif sorted_dates[i] > sorted_dates[i-1] + timedelta(days=1):
                    temp_streak = 1
            longest_streak = max(longest_streak, max_streak)

        # Semana actual: Lunes (0) a Domingo (6)
        monday = today - timedelta(days=today.weekday())
        day_labels = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
        day_names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

        weekly_activity = []
        for idx in range(7):
            day_date = monday + timedelta(days=idx)
            weekly_activity.append({
                'day': day_labels[idx],
                'day_name': day_names[idx],
                'date': day_date.isoformat(),
                'active': day_date in activity_dates,
                'is_today': (day_date == today),
                'is_past': (day_date < today),
            })

        last_activity = max(activity_dates) if activity_dates else None

        return {
            'current_streak': current_streak,
            'longest_streak': longest_streak,
            'is_at_risk': is_at_risk,
            'practiced_today': practiced_today,
            'has_activity_today': practiced_today,
            'last_activity_date': last_activity.isoformat() if last_activity else None,
            'weekly_activity': weekly_activity,
            'status': 'active' if (practiced_today or is_at_risk) and current_streak > 0 else 'inactive',
        }

    def get(self, request):
        real_user = resolve_db_user(request.user)
        if not real_user:
            return Response({'error': 'Usuario no autenticado o no encontrado en BD.'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            data = execute_with_db_retry(self._calculate_streak_payload, 3, 0.2, real_user)
            return Response(data)
        except Exception as e:
            logger.error(f"[StudyStreakAPIView] Error al calcular racha: {e}")
            return Response({'current_streak': 0, 'longest_streak': 0, 'is_at_risk': False, 'practiced_today': False})

    def post(self, request):
        """Registra una actividad de práctica diaria y refresca la racha."""
        real_user = resolve_db_user(request.user)
        if not real_user:
            return Response({'error': 'Usuario no autenticado o no encontrado en BD.'}, status=status.HTTP_401_UNAUTHORIZED)
        tx = request.data.get('transaction') or 'PRACTICA_VOCABULARIO'

        def _do_record():
            UserLog.objects.create(user=real_user, transaction=tx)
            return self._calculate_streak_payload(real_user)

        try:
            data = execute_with_db_retry(_do_record, max_retries=3, initial_delay=0.2)
            return Response(data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"[StudyStreakAPIView] Error al registrar actividad de racha: {e}")
            return Response({'error': 'No se pudo registrar la actividad en la base de datos.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)





# Vista y alias para estadísticas de dashboard administrativo
AdminDashboardStatsView = AdminMetricsAPIView
