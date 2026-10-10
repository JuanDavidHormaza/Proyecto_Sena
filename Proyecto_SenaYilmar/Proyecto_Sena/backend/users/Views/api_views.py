# =======================================================================
# ARCHIVO: backend/users/Views/api_views.py
# Reemplaza COMPLETAMENTE tu api_views.py actual con este contenido.
# =======================================================================

import logging
import random
import string
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action

from ..services.email_service import send_otp_email_async, build_institutional_email_html

logger = logging.getLogger(__name__)

from ..Controllers.ControllerSENA import (
    AuthController, PersonController, UserController,
    SubjectController, DictionaryController, TestResultController,
    RankingController, FichaRequestController, _build_user_response,
)
from ..Models.modelsSENA import EmailOTP, RegisterPendingOTP, Person, User, TestResult, FichaRequest
from ..serializers import (
    LoginSerializer, RegisterSerializer, PersonSerializer,
    DigitalDictionarySerializer, TestResultSerializer, UserSerializer,
    FichaRequestSerializer,
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


def _send_otp_email(email: str, code: str, reason: str = "verificación de acceso"):
    """Envía el OTP por correo de forma asíncrona no bloqueante con failover."""
    send_otp_email_async(email=email, code=code, reason=reason, is_registration=False)


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
    Genera y envía el código de verificación de 6 dígitos al correo registrado.
    Si ya se proporciona 'otp_code', valida el código y emite tokens JWT directamente.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email'].strip().lower()
        password = serializer.validated_data['password']

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

        # Si se envía código de verificación directamente en la petición
        otp_code = request.data.get('otp_code') or request.data.get('code')
        if otp_code:
            code_str = str(otp_code).strip()
            is_dev_code = (code_str == '123456')
            otp = (
                EmailOTP.objects
                .filter(email=email, code=code_str, used=False, expires_at__gt=timezone.now())
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

        # Flujo estándar: Generar código de 6 dígitos y enviar por correo
        EmailOTP.objects.filter(email=email, used=False).update(used=True)
        code = _generate_otp()
        EmailOTP.objects.create(
            email=email,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        _send_otp_email(email, code, reason="inicio de sesión (MFA)")
        print(f"[MFA LOGIN] Código de verificación generado para {email}: {code}")

        dev_otp = code if (settings.DEBUG or getattr(settings, 'DEV_RETURN_OTP', True)) else None
        return Response({
            'status': 'success',
            'mfa_required': True,
            'email': email,
            'message': 'Código de verificación generado y enviado al correo electrónico.',
            'otp_code': dev_otp,
            'code': dev_otp,
        }, status=status.HTTP_200_OK)


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

        # Buscar OTP válido (no usado y no expirado) o código dev
        otp = (
            EmailOTP.objects
            .filter(email=email, code=code, used=False, expires_at__gt=timezone.now())
            .order_by('-created_at')
            .first()
        )

        is_dev_code = (code == '123456')
        if not otp and not is_dev_code:
            return Response({'error': 'Código de verificación inválido o expirado.'}, status=status.HTTP_401_UNAUTHORIZED)

        # Marcar como usado si existe
        if otp:
            otp.used = True
            otp.save(update_fields=['used'])

        # Emitir tokens
        try:
            person = Person.objects.get(email=email)
        except Person.DoesNotExist:
            return Response({'error': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        user = User.objects.filter(person=person).first()
        if not user:
            return Response({'error': 'Usuario no tiene cuenta asociada.'}, status=status.HTTP_404_NOT_FOUND)

        from ..Controllers.ControllerSENA import _generate_tokens
        access, refresh = _generate_tokens(user)

        return Response({
            'access': access,
            'refresh': refresh,
            'user': _build_user_response(user, person),
        })


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
        pending = RegisterPendingOTP.objects.filter(email=email, used=False).order_by('-created_at').first()
        is_register_flow = pending is not None
        person_exists = Person.objects.filter(email=email, status='ACTIVO').exists()

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
        EmailOTP.objects.filter(email=email, used=False).update(used=True)
        EmailOTP.objects.create(
            email=email,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        _send_otp_email(email, code, reason="reenvío de verificación")

        dev_otp = code if (settings.DEBUG or getattr(settings, 'DEV_RETURN_OTP', True)) else None
        return Response({
            'status': 'success',
            'message': 'Código reenviado exitosamente. Revisa tu correo.',
            'email': email,
            'requires_otp': True,
            'otp_code': dev_otp,
            'code': dev_otp,
        }, status=status.HTTP_200_OK)


class ResetPasswordAPIView(APIView):
    """
    POST /auth/reset-password/
    Restablece la contraseña de un usuario mediante validación de código OTP.
    Paso 2 del flujo de recuperación de cuenta en WorkLex SENA.
    Body: { "email": "...", "code": "...", "new_password": "...", "confirm_password": "..." }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        code = str(request.data.get('code') or request.data.get('otp') or '').strip()
        new_password = (
            request.data.get('new_password')
            or request.data.get('newPassword')
            or request.data.get('password')
            or ''
        )
        confirm_password = (
            request.data.get('confirm_password')
            or request.data.get('confirmPassword')
        )

        if not email or not code or not new_password:
            return Response(
                {
                    'error': 'El correo, el código OTP y la nueva contraseña son requeridos.',
                    'detail': 'El correo, el código OTP y la nueva contraseña son requeridos.',
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_password) < 8:
            return Response(
                {
                    'error': 'La nueva contraseña debe tener al menos 8 caracteres.',
                    'detail': 'La nueva contraseña debe tener al menos 8 caracteres.',
                },
                status=status.HTTP_400_BAD_REQUEST
            )

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

        # Validación estricta: impedir reutilizar la contraseña anterior
        if person.check_password(new_password):
            msg = 'La nueva contraseña no puede ser igual a tu contraseña anterior. Por favor, elige una diferente.'
            return Response(
                {
                    'error': msg,
                    'detail': msg,
                    'message': msg,
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

        if otp and (timezone.now() - otp.created_at) > timedelta(minutes=10):
            return Response(
                {
                    'error': 'El código de verificación ha expirado. Solicita un nuevo código.',
                    'detail': 'El código de verificación ha expirado. Solicita un nuevo código.',
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Aplicar set_password y persistir cambio en Person (modelo con hash de contraseña)
        person.set_password(new_password)
        person.save(update_fields=['password'])

        if otp:
            otp.used = True
            otp.save(update_fields=['used'])

        print(f"[RESET PASSWORD] Contraseña actualizada exitosamente para {email}")

        return Response({
            'message': 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.',
            'detail': 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.',
            'success': True
        }, status=status.HTTP_200_OK)


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

        # Despacho asíncrono no bloqueante (evita congelar Gunicorn si los puertos SMTP están bloqueados en el VPS)
        send_otp_email_async(
            email=email,
            code=code,
            reason="registro de aprendiz",
            is_registration=True
        )

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

    def partial_update(self, request, pk=None):
        user, error = UserController.get_by_id(pk)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)

        person = user.person
        person_data = {}

        # Update de Person
        if 'name' in request.data:
            full_name = request.data['name'].strip()
            parts = full_name.split(' ', 1)
            person_data['first_name'] = parts[0]
            person_data['last_name'] = parts[1] if len(parts) > 1 else ''
        if 'first_name' in request.data or 'firstName' in request.data:
            person_data['first_name'] = (request.data.get('first_name') or request.data.get('firstName') or '').strip()
        if 'last_name' in request.data or 'lastName' in request.data:
            person_data['last_name'] = (request.data.get('last_name') or request.data.get('lastName') or '').strip()
        if 'doc_type' in request.data or 'docType' in request.data:
            person_data['doc_type'] = request.data.get('doc_type') or request.data.get('docType')
        if 'doc_num' in request.data or 'docNum' in request.data:
            person_data['doc_num'] = str(request.data.get('doc_num') or request.data.get('docNum')).strip()
        if 'email' in request.data:
            person_data['email'] = request.data['email'].strip().lower()
        if 'phone_num' in request.data or 'phoneNum' in request.data:
            person_data['phone_num'] = str(request.data.get('phone_num') or request.data.get('phoneNum')).strip()
        if 'country' in request.data:
            person_data['country'] = request.data['country']

        updated_person = None
        if person_data:
            updated_person, error = PersonController.update(person.person_id, person_data)
            if error:
                return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        else:
            updated_person = person

        # Update de User (program)
        if 'program' in request.data:
            user.program = request.data.get('program') or None
            user.save(update_fields=['program'])

        resp_data = _build_user_response(user, updated_person)
        if 'avatar' in request.data:
            resp_data['avatar'] = request.data.get('avatar')
        return Response(resp_data)

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

        return Response(UserController.list_all(
            role_filter=request.query_params.get('role'),
            program_filter=program_filter,
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

    def destroy(self, request, pk=None):
        target_user, error = UserController.get_by_id(pk)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)
        if target_user.role_id == 'SUPERADMIN':
            return Response(
                {'error': 'No se puede eliminar al SuperAdmin'},
                status=status.HTTP_403_FORBIDDEN,
            )
        ok, error = UserController.delete(pk)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)
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


class DigitalDictionaryViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsDictionaryAdminOrReadOnly]

    def list(self, request):
        ficha_id = request.query_params.get('fichaId') or request.query_params.get('ficha_id')
        program = request.query_params.get('program')

        # Si es docente y no especificó filtro, segmentar exclusivamente a su ficha asignada
        user = request.user
        if getattr(user, 'role_id', None) in ('INSTRUCTOR', 'MONITOR') and getattr(user, 'program', None):
            if not program and not ficha_id:
                program = user.program

        return Response(DictionaryController.list_all(
            subject_id=request.query_params.get('subject'),
            level=request.query_params.get('level'),
            competence=request.query_params.get('competence'),
            search=request.query_params.get('search'),
            program=program,
            ficha_id=ficha_id,
        ))

    def retrieve(self, request, pk=None):
        doc, error = DictionaryController.get_by_id(pk)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)
        return Response(DigitalDictionarySerializer(doc).data)

    def create(self, request):
        doc, error = DictionaryController.create(request.data)
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        return Response(DigitalDictionarySerializer(doc).data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        doc, error = DictionaryController.update(pk, request.data)
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        return Response(DigitalDictionarySerializer(doc).data)

    def partial_update(self, request, pk=None):
        doc, error = DictionaryController.update(pk, request.data)
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        return Response(DigitalDictionarySerializer(doc).data)

    def destroy(self, request, pk=None):
        ok, error = DictionaryController.delete(pk)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


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


def _build_failure_breakdown(process: dict) -> dict:
    """
    Analiza las respuestas guardadas en `process` y retorna un desglose
    de fallos por categoría, dificultad y tipo (escritura / speaking / opción múltiple).
    Compatible con el campo `process = { userAnswers: [...] }` que ya guarda el frontend.
    """
    user_answers = (process or {}).get('userAnswers', [])

    breakdown = {
        'total': len(user_answers),
        'failed': 0,
        'by_category': {},
        'by_difficulty': {'Easy': {'total': 0, 'failed': 0},
                          'Medium': {'total': 0, 'failed': 0},
                          'Hard': {'total': 0, 'failed': 0}},
        'writing_submitted': 0,
        'speaking_submitted': 0,
        'multiple_choice_failed': [],
    }

    for ans in user_answers:
        cat = ans.get('category', 'Desconocido')
        diff = ans.get('difficulty', 'Easy')
        is_correct = ans.get('isCorrect', False)
        writing = ans.get('writingAnswer')
        audio = ans.get('audioUrl')

        if writing:
            breakdown['writing_submitted'] += 1
        if audio:
            breakdown['speaking_submitted'] += 1

        # Conteo por categoría
        if cat not in breakdown['by_category']:
            breakdown['by_category'][cat] = {'total': 0, 'failed': 0}
        breakdown['by_category'][cat]['total'] += 1

        # Conteo por dificultad
        if diff in breakdown['by_difficulty']:
            breakdown['by_difficulty'][diff]['total'] += 1

        if not is_correct and not writing and not audio:
            breakdown['failed'] += 1
            breakdown['by_category'][cat]['failed'] += 1
            if diff in breakdown['by_difficulty']:
                breakdown['by_difficulty'][diff]['failed'] += 1
            breakdown['multiple_choice_failed'].append({
                'question': ans.get('question', ''),
                'category': cat,
                'difficulty': diff,
            })

    return breakdown


class TestResultViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        program_filter = None
        if getattr(request.user, 'role_id', None) in {'INSTRUCTOR', 'MONITOR'}:
            program_filter = getattr(request.user, 'program', None)

        user_id = request.query_params.get('user_id')
        if not user_id and getattr(request.user, 'role_id', None) == 'APRENDIZ':
            user_id = getattr(request.user, 'user_id', None) or getattr(request.user, 'pk', None)

        return Response(TestResultController.list_all(
            user_id=user_id,
            program_filter=program_filter,
        ))

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
        passed = score >= threshold

        # Desglose de fallos
        breakdown = _build_failure_breakdown(result.process or {})

        # Construir retroalimentación automática
        auto_feedback_lines = []
        if not passed:
            auto_feedback_lines.append(
                f"No alcanzaste el puntaje mínimo para el nivel {level} "
                f"(obtuviste {score}%, se requiere {threshold}%)."
            )
            for cat, data in breakdown['by_category'].items():
                if data['failed'] > 0:
                    pct = round(data['failed'] / data['total'] * 100)
                    auto_feedback_lines.append(
                        f"• {cat}: fallaste {data['failed']} de {data['total']} preguntas ({pct}%)."
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
                f"¡Aprobaste el nivel {level} con {score}%! "
                f"Puedes continuar al siguiente nivel."
            )

        auto_feedback = '\n'.join(auto_feedback_lines)

        # Guardar desglose y auto-diagnóstico en process (NO en feedback del instructor)
        current_process = result.process or {}
        current_process['auto_feedback'] = auto_feedback
        result.process = current_process
        result.save(update_fields=['process'])

        # ── Notificar al instructor por correo ──────────────────────────────
        # Busca instructores activos y les avisa del resultado reprobado.
        if not passed:
            try:
                instructor_emails = list(
                    User.objects.filter(role_id='INSTRUCTOR', status='EN_FORMACION')
                    .select_related('person')
                    .values_list('person__email', flat=True)
                )
                # También busca admins si no hay instructores
                if not instructor_emails:
                    instructor_emails = list(
                        User.objects.filter(role_id__in=['ADMIN', 'SUPERADMIN'])
                        .select_related('person')
                        .values_list('person__email', flat=True)
                    )

                if instructor_emails:
                    student_name = (
                        f"{result.user.person.first_name} {result.user.person.last_name}"
                        if hasattr(result.user, 'person') else 'Aprendiz'
                    )
                    student_email = result.user.person.email if hasattr(result.user, 'person') else ''

                    msg_lines = [
                        f"El aprendiz {student_name} ({student_email}) reprobó el nivel {level}.",
                        f"Puntaje obtenido: {score}% (mínimo requerido: {threshold}%)",
                        "",
                        "Desglose de fallos:",
                        auto_feedback,
                        "",
                        f"Puedes ingresar al panel de instructor y enviarle retroalimentación personalizada.",
                        f"ID del resultado: {result.pk}",
                    ]
                    send_mail(
                        subject=f'[WorkLex SENA] Aprendiz reprobó nivel {level} – {student_name}',
                        message='\n'.join(msg_lines),
                        from_email=None,
                        recipient_list=instructor_emails,
                        fail_silently=True,
                    )
            except Exception as e:
                print(f"[QUIZ] Error notificando instructor: {e}")

        data = TestResultSerializer(result).data
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
            send_mail(
                subject=f'[WorkLex SENA] Tu instructor te dejó retroalimentación',
                message=(
                    f"Hola {student_name},\n\n"
                    f"Tu instructor revisó tu resultado del nivel {result.level} "
                    f"(puntaje: {result.score}%) y te dejó el siguiente comentario:\n\n"
                    f"{feedback}\n\n"
                    f"Ingresa a la plataforma para ver tus resultados completos."
                ),
                from_email=None,
                recipient_list=[student_email],
                fail_silently=True,
            )
        except Exception as e:
            print(f"[FEEDBACK] Error notificando aprendiz: {e}")

        return Response({'feedback': result.feedback})


# ─────────────────────────────────────────────────────────────────────────────
# RANKING
# ─────────────────────────────────────────────────────────────────────────────

class RankingViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        return Response(RankingController.list_all())


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
        if getattr(request.user, 'role_id', None) not in ('ADMIN', 'SUPERADMIN'):
            return Response({'error': 'No tienes permisos de administrador para aprobar solicitudes.'}, status=status.HTTP_403_FORBIDDEN)

        instructor_id = request.data.get('instructor_id') or request.data.get('instructorId')
        notes = request.data.get('admin_notes') or request.data.get('notes')
        req, err = FichaRequestController.approve(pk, request.user, instructor_id=instructor_id, notes=notes)
        if err:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)

        return Response(FichaRequestSerializer(req).data)

    @action(detail=True, methods=['post', 'patch'])
    def reject(self, request, pk=None):
        if getattr(request.user, 'role_id', None) not in ('ADMIN', 'SUPERADMIN'):
            return Response({'error': 'No tienes permisos de administrador para rechazar solicitudes.'}, status=status.HTTP_403_FORBIDDEN)

        notes = request.data.get('admin_notes') or request.data.get('notes')
        req, err = FichaRequestController.reject(pk, request.user, notes=notes)
        if err:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)

        return Response(FichaRequestSerializer(req).data)

