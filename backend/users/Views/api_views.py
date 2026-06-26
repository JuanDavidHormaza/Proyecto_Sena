# =======================================================================
# ARCHIVO: backend/users/Views/api_views.py
# Reemplaza COMPLETAMENTE tu api_views.py actual con este contenido.
# =======================================================================

import random
import string
from datetime import timedelta

from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action

from ..Controllers.ControllerSENA import (
    AuthController, PersonController, UserController,
    SubjectController, DictionaryController, TestResultController,
    RankingController, _build_user_response,
)
from ..Models.modelsSENA import EmailOTP, RegisterPendingOTP, Person, User, TestResult
from ..serializers import (
    LoginSerializer, RegisterSerializer, PersonSerializer,
    DigitalDictionarySerializer, TestResultSerializer, UserSerializer,
)
from ..permissions import IsSuperAdmin, IsAdminOrSuperAdmin
# NOTE: no se usa SESSION_KEY en este archivo; se usa request.session directamente.




# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _generate_otp(length=6):
    """Genera un código numérico de 6 dígitos."""
    return ''.join(random.choices(string.digits, k=length))


def _send_otp_email(email: str, code: str):
    """Envía el OTP por correo usando el backend configurado en settings.py."""
    send_mail(
        subject='Tu código de verificación - WorkLex SENA',
        message=(
            f'Tu código de verificación es: {code}\n\n'
            f'Este código expira en 10 minutos.\n\n'
            f'Si no solicitaste este código, ignora este mensaje.'
        ),
        from_email=None,          # usa DEFAULT_FROM_EMAIL de settings.py
        recipient_list=[email],
        fail_silently=False,
    )


# ─────────────────────────────────────────────────────────────────────────────
# AUTENTICACIÓN
# ─────────────────────────────────────────────────────────────────────────────

class LoginAPIView(APIView):
    """
    POST /auth/login/
    Paso 1 del MFA: verifica credenciales y envía OTP al correo.
    Responde con { "mfa_required": true, "email": "..." }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        # Verificar credenciales sin emitir token todavía
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



        # Invalidar OTPs anteriores para este email
        EmailOTP.objects.filter(email=email, used=False).update(used=True)

        # Crear nuevo OTP (expira en 10 min)
        code = _generate_otp()
        EmailOTP.objects.create(
            email=email,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        # Para desarrollo: siempre logueamos el OTP para que puedas copiarlo aunque no haya SMTP.
        print(f"[MFA] OTP para {email}: {code}")
        try:
            _send_otp_email(email, code)
        except Exception as e:
            print(f"[MFA] Error enviando OTP para {email}: {e}")

        return Response({'mfa_required': True, 'email': email, 'otp_debug': code})





class VerifyOTPAPIView(APIView):



    """
    POST /auth/verify-otp/
    Paso 2 del MFA: valida el código OTP y devuelve tokens JWT.
    Body: { "email": "...", "code": "123456" }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        code = request.data.get('code', '').strip()

        if not email or not code:
            return Response({'error': 'Email y código son requeridos.'}, status=status.HTTP_400_BAD_REQUEST)

        # Buscar OTP válido (no usado y no expirado)
        otp = (
            EmailOTP.objects
            .filter(email=email, code=code, used=False, expires_at__gt=timezone.now())
            .order_by('-created_at')
            .first()
        )

        if not otp:
            return Response({'error': 'Código inválido o expirado.'}, status=status.HTTP_401_UNAUTHORIZED)

        # Marcar como usado
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


class ResendOTPAPIView(APIView):
    """
    POST /auth/resend-otp/
    Reenvía el OTP si el usuario no lo recibió.
    Body: { "email": "..." }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'Email es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        # Verificar que el email existe
        if not Person.objects.filter(email=email, status='ACTIVO').exists():
            # Respuesta genérica para no filtrar información
            return Response({'message': 'Si el correo existe, se enviará el código.'})

        # Invalidar OTPs anteriores
        EmailOTP.objects.filter(email=email, used=False).update(used=True)

        code = _generate_otp()
        EmailOTP.objects.create(
            email=email,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        try:
            _send_otp_email(email, code)
        except Exception as e:
            print(f"[MFA] OTP para {email}: {code}  (error al enviar: {e})")

        return Response({'message': 'Código reenviado. Revisa tu correo.'})


class RegisterAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']

        # ── Verificación de dominio via DNS MX ──────────────────────────
        import dns.resolver
        domain = email.split('@')[-1]
        try:
            dns.resolver.resolve(domain, 'MX')
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.exception.DNSException):
            return Response(
                {'error': f'El correo "{email}" no parece válido. El dominio "{domain}" no acepta correos.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

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

        return Response({
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

class RegisterSendOTPAPIView(APIView):
    """
    POST /auth/register-send-otp/
    Paso 1 del registro con verificación de correo.
    - Valida que el dominio del correo exista (DNS MX)
    - Verifica que el correo y documento no estén ya registrados
    - Envía un OTP al correo
    - NO crea la cuenta todavía
    Body: todos los campos del registro (igual que /auth/register/)
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from ..serializers import RegisterSerializer
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email'].strip().lower()
        doc_num = serializer.validated_data['doc_num']

        # ── 1. Verificar que el dominio acepta correos (DNS MX) ──────────
        import dns.resolver
        domain = email.split('@')[-1]
        try:
            dns.resolver.resolve(domain, 'MX')
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.exception.DNSException):
            return Response(
                {'error': f'El correo "{email}" no parece válido. El dominio "{domain}" no existe o no acepta correos.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── 2. Verificar que no esté ya registrado ───────────────────────
        if Person.objects.filter(email=email).exists():
            return Response(
                {'error': 'Este correo ya está registrado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if Person.objects.filter(doc_num=doc_num).exists():
            return Response(
                {'error': 'Este número de documento ya está registrado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── 3. Guardar los datos del formulario en el OTP (como JSON) ────
        # Usamos el campo `code` para el código y un segundo registro
        # para los datos pendientes, o simplemente guardamos en cache/session.
        # Aquí usamos una solución simple: guardamos los datos en un OTP
        # extendido usando el modelo EmailOTP con un campo extra implícito
        # (guardamos el JSON de datos en un OTP ficticio con code="DATA",
        #  y el OTP real con el código de 6 dígitos).
        import json

        # Invalidar OTPs anteriores para este email (flujo de registro)
        RegisterPendingOTP.objects.filter(email=email, used=False).update(used=True)

        # Guardar payload completo del registro en un modelo dedicado (NO truncar)
        payload = serializer.validated_data
        RegisterPendingOTP.objects.create(
            email=email,
            otp_code=_generate_otp(),
            payload=json.dumps(payload),
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        # Generar y enviar OTP (traemos el code del modelo)
        pending = RegisterPendingOTP.objects.filter(email=email, used=False).order_by('-created_at').first()
        code = pending.otp_code

        # Invalidar OTPs anteriores “normales” para este email (por si el usuario ya hizo login)
        EmailOTP.objects.filter(email=email, used=False).update(used=True)

        # Guardar OTP para que /register-verify-otp pueda validarlo
        EmailOTP.objects.create(
            email=email,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        try:
            send_mail(
                subject='Verifica tu correo - WorkLex SENA',
                message=(
                    f'Tu código de verificación para crear tu cuenta es: {code}\n\n'
                    f'Este código expira en 10 minutos.\n\n'
                    f'Si no solicitaste este código, ignora este mensaje.'
                ),
                from_email=None,
                recipient_list=[email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"[REGISTER OTP] OTP para {email}: {code}  (error al enviar: {e})")

        return Response({
            'message': 'Código de verificación enviado. Revisa tu correo.',
            'email': email,
        })


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
        code  = request.data.get('code', '').strip()

        if not email or not code:
            return Response(
                {'error': 'Email y código son requeridos.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── 1. Verificar OTP ─────────────────────────────────────────────
        otp = (
            EmailOTP.objects
            .filter(email=email, code=code, used=False, expires_at__gt=timezone.now())
            .order_by('-created_at')
            .first()
        )
        if not otp:
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

        # Verificar de nuevo que no se registró mientras esperaba
        if Person.objects.filter(email=email).exists():
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
        if 'email' in request.data:
            person_data['email'] = request.data['email']
        if 'phone_num' in request.data:
            person_data['phone_num'] = request.data['phone_num']

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

        return Response(_build_user_response(user, updated_person))
    def list(self, request):
        return Response(UserController.list_all(
            role_filter=request.query_params.get('role')
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
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        return Response(DictionaryController.list_all(
            subject_id=request.query_params.get('subject')
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
        return Response(TestResultController.list_all(
            user_id=request.query_params.get('user_id')
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

        # Guardar retroalimentación automática en el resultado
        if not result.feedback:
            result.feedback = auto_feedback
            result.save(update_fields=['feedback'])

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