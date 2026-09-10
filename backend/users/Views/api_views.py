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
from ..Models.modelsSENA import (
    EmailOTP, RegisterPendingOTP, Person, User, TestResult,
    TrainingGroup, TrainingGroupStudent, MediaAsset, Subject,
)
from ..serializers import (
    LoginSerializer, RegisterSerializer, PersonSerializer,
    DigitalDictionarySerializer, TestResultSerializer, UserSerializer,
    MediaAssetSerializer,
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

        # ── Solo los ESTUDIANTES usan verificación por correo (OTP/MFA). ──────
        # Docentes, administradores y super administradores entran directo,
        # sin código de verificación.
        privileged_roles = {'SUPERADMIN', 'ADMIN', 'INSTRUCTOR'}
        if getattr(user, 'role_id', None) in privileged_roles:
            from ..Controllers.ControllerSENA import _generate_tokens
            access, refresh = _generate_tokens(user)
            return Response({
                'mfa_required': False,
                'access': access,
                'refresh': refresh,
                'user': _build_user_response(user, person),
            })

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
        program_filter = None
        student_ids = None
        if getattr(request.user, 'role_id', None) in {'INSTRUCTOR', 'MONITOR'}:
            student_ids = TrainingGroupStudent.objects.filter(
                group__teachers=request.user,
            ).values_list('student_id', flat=True)

        users = UserController.list_all(
            role_filter=request.query_params.get('role'),
            program_filter=program_filter,
        )
        if student_ids is not None:
            allowed_ids = {str(student_id) for student_id in student_ids}
            users = [user for user in users if user['id'] in allowed_ids]
        return Response(users)


def _group_response(group):
    teachers = [
        _build_user_response(teacher, teacher.person)
        for teacher in group.teachers.select_related('person').all()
    ]
    students = [
        _build_user_response(membership.student, membership.student.person)
        for membership in group.student_memberships.select_related('student__person').all()
    ]
    return {
        'id': str(group.id),
        'ficha': group.ficha,
        'program': group.program,
        'teachers': teachers,
        'students': students,
        'createdAt': group.created_at.isoformat() if group.created_at else None,
    }


class TrainingGroupViewSet(viewsets.ViewSet):
    """Administración de fichas. Todas las asignaciones se persisten en tablas."""
    permission_classes = [IsAdminOrSuperAdmin]

    def list(self, request):
        groups = TrainingGroup.objects.prefetch_related(
            'teachers__person', 'student_memberships__student__person'
        ).all()
        return Response([_group_response(group) for group in groups])

    def retrieve(self, request, pk=None):
        try:
            group = TrainingGroup.objects.prefetch_related(
                'teachers__person', 'student_memberships__student__person'
            ).get(pk=pk)
        except TrainingGroup.DoesNotExist:
            return Response({'error': 'Ficha no encontrada'}, status=status.HTTP_404_NOT_FOUND)
        return Response(_group_response(group))

    @action(detail=False, methods=['get'], url_path='available-students')
    def available_students(self, request):
        program = (request.query_params.get('program') or '').strip()
        group_id = request.query_params.get('group_id')
        if not program:
            return Response({'error': 'El programa es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        assigned = TrainingGroupStudent.objects.filter(program__iexact=program)
        if group_id:
            assigned = assigned.exclude(group_id=group_id)
        assigned_ids = assigned.values_list('student_id', flat=True)
        students = User.objects.select_related('person').filter(
            role_id='APRENDIZ', program__iexact=program
        ).exclude(pk__in=assigned_ids)
        return Response([_build_user_response(student, student.person) for student in students])

    @action(detail=False, methods=['get'], url_path='available-teachers')
    def available_teachers(self, request):
        teachers = User.objects.select_related('person').filter(role_id__in=['INSTRUCTOR', 'MONITOR'])
        return Response([_build_user_response(teacher, teacher.person) for teacher in teachers])

    def create(self, request):
        return self._save_group(request)

    def update(self, request, pk=None):
        try:
            group = TrainingGroup.objects.get(pk=pk)
        except TrainingGroup.DoesNotExist:
            return Response({'error': 'Ficha no encontrada'}, status=status.HTTP_404_NOT_FOUND)
        return self._save_group(request, group)

    partial_update = update

    def _save_group(self, request, group=None):
        ficha = str(request.data.get('ficha', group.ficha if group else '')).strip()
        program = str(request.data.get('program', group.program if group else '')).strip()
        teacher_ids = request.data.get('teacher_ids', None)
        student_ids = request.data.get('student_ids', None)
        if not ficha or not program:
            return Response({'error': 'El número de ficha y el programa son requeridos.'}, status=status.HTTP_400_BAD_REQUEST)

        duplicate = TrainingGroup.objects.filter(ficha=ficha)
        if group:
            duplicate = duplicate.exclude(pk=group.pk)
        if duplicate.exists():
            return Response({'error': 'Ya existe una ficha con ese número.'}, status=status.HTTP_400_BAD_REQUEST)

        if teacher_ids is not None:
            teachers = list(User.objects.filter(pk__in=teacher_ids, role_id__in=['INSTRUCTOR', 'MONITOR']))
            if len(teachers) != len(set(map(str, teacher_ids))):
                return Response({'error': 'Uno o más docentes no son válidos.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            teachers = None

        if student_ids is not None:
            students = list(User.objects.filter(pk__in=student_ids, role_id='APRENDIZ', program__iexact=program))
            if len(students) != len(set(map(str, student_ids))):
                return Response({'error': 'Los estudiantes deben ser aprendices del programa seleccionado.'}, status=status.HTTP_400_BAD_REQUEST)
            used = TrainingGroupStudent.objects.filter(student_id__in=[s.pk for s in students], program__iexact=program)
            if group:
                used = used.exclude(group=group)
            if used.exists():
                return Response({'error': 'Un estudiante ya pertenece a otra ficha de este programa.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            students = None

        from django.db import transaction
        with transaction.atomic():
            if group is None:
                group = TrainingGroup.objects.create(ficha=ficha, program=program)
            else:
                # Cambiar el programa no puede dejar inscripciones incoherentes.
                if program != group.program and group.student_memberships.exists():
                    return Response({'error': 'No se puede cambiar el programa mientras la ficha tenga estudiantes.'}, status=status.HTTP_400_BAD_REQUEST)
                group.ficha = ficha
                group.program = program
                group.save()
            if teachers is not None:
                group.teachers.set(teachers)
            if students is not None:
                group.student_memberships.all().delete()
                TrainingGroupStudent.objects.bulk_create([
                    TrainingGroupStudent(group=group, student=student, program=program)
                    for student in students
                ])
        group = TrainingGroup.objects.prefetch_related('teachers__person', 'student_memberships__student__person').get(pk=group.pk)
        return Response(_group_response(group), status=status.HTTP_201_CREATED if request.method == 'POST' else status.HTTP_200_OK)

    def destroy(self, request, pk=None):
        try:
            TrainingGroup.objects.get(pk=pk).delete()
        except TrainingGroup.DoesNotExist:
            return Response({'error': 'Ficha no encontrada'}, status=status.HTTP_404_NOT_FOUND)
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
        data = DictionaryController.list_all(
            subject_id=request.query_params.get('subject')
        )
        print(f"[DigitalDictionaryViewSet] /api/dictionary/ -> {len(data)} registros")
        return Response(data)

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
        return self.update(request, pk=pk)

    def destroy(self, request, pk=None):
        ok, error = DictionaryController.delete(pk)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class DictionaryDebugView(APIView):
    """Diagnóstico simple: conteo de palabras en BD y de archivos en MinIO."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from users.Models.modelsSENA import DigitalDictionary
        from users.services import media_storage

        bd_count = DigitalDictionary.objects.count()
        media_counts = {
            "images": MediaAsset.objects.filter(media_type="image").count(),
            "audios": MediaAsset.objects.filter(media_type="audio").count(),
            "videos": MediaAsset.objects.filter(media_type="video").count(),
        }

        minio_error = None
        try:
            media_storage.ensure_buckets()
        except Exception as exc:
            minio_error = str(exc)

        return Response({
            "bd_count": bd_count,
            "media_counts": media_counts,
            "total_media": MediaAsset.objects.count(),
            "minio_error": minio_error,
            "minio_endpoint": media_storage.os.getenv("MINIO_ENDPOINT", ""),
        })


# ─────────────────────────────────────────────────────────────────────────────
# MULTIMEDIA (MinIO) — Programa > Ficha > Tipo (y su inversa)
# ─────────────────────────────────────────────────────────────────────────────

class MediaAssetViewSet(viewsets.ViewSet):
    """
    Gestiona los archivos multimedia (imagen/audio/video) guardados en MinIO,
    organizados por Programa y Ficha.

    GET /api/media/                -> lista (filtros: program, ficha, media_type)
    GET /api/media/tree/           -> árbol Programa > Ficha > Tipo
    GET /api/media/tree_by_type/   -> árbol inverso Tipo > Programa > Ficha
    POST /api/media/               -> sube un archivo (multipart/form-data)
    DELETE /api/media/{id}/        -> elimina el archivo (BD + MinIO)
    """
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        qs = MediaAsset.objects.select_related('uploaded_by__person', 'subject').all()

        media_type = request.query_params.get('media_type')
        program = request.query_params.get('program')
        ficha = request.query_params.get('ficha')

        if media_type:
            qs = qs.filter(media_type=media_type)
        if program:
            qs = qs.filter(program__iexact=program)
        if ficha:
            qs = qs.filter(ficha__iexact=ficha)

        return Response(MediaAssetSerializer(qs, many=True).data)

    def create(self, request):
        """Sube un archivo a MinIO y crea el registro MediaAsset."""
        from ..services import media_storage

        uploaded_file = request.FILES.get('file')
        media_type = request.data.get('media_type', '')
        program = (request.data.get('program') or '').strip()
        ficha = (request.data.get('ficha') or '').strip()

        if not uploaded_file:
            return Response({'error': 'El archivo es requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        if media_type not in ('image', 'audio', 'video'):
            return Response({'error': 'media_type debe ser image, audio o video.'}, status=status.HTTP_400_BAD_REQUEST)
        if not program:
            return Response({'error': 'El programa es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        subject = None
        subject_id = request.data.get('subject')
        if subject_id:
            subject = Subject.objects.filter(pk=subject_id).first()

        try:
            data = uploaded_file.read()
            upload_result = media_storage.upload_bytes(
                media_type,
                program,
                ficha,
                uploaded_file.name,
                data,
                content_type=uploaded_file.content_type or '',
            )
        except Exception as exc:
            return Response({'error': f'No se pudo subir el archivo: {exc}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # request.user es un AuthenticatedUser (wrapper), no la instancia real
        # del modelo User -> hay que resolverla por user_id para el FK.
        uploader = None
        user_id = getattr(request.user, 'user_id', None)
        if user_id is not None:
            uploader = User.objects.filter(pk=user_id).first()

        asset = MediaAsset.objects.create(
            media_type=media_type,
            program=program,
            ficha=ficha,
            word_id=request.data.get('word_id', ''),
            definition=request.data.get('definition', ''),
            synonyms=request.data.get('synonyms', ''),
            subject=subject,
            bucket=upload_result['bucket'],
            object_key=upload_result['object_key'],
            url=upload_result['url'],
            original_filename=uploaded_file.name,
            size_bytes=uploaded_file.size,
            uploaded_by=uploader,
        )

        return Response(MediaAssetSerializer(asset).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None):
        from ..services import media_storage

        try:
            asset = MediaAsset.objects.get(pk=pk)
        except MediaAsset.DoesNotExist:
            return Response({'error': 'Archivo no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        media_storage.delete_object(asset.bucket, asset.object_key)
        asset.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], url_path='tree')
    def tree(self, request):
        """
        Árbol NORMAL: Programa -> Ficha -> Tipo de medio.
        [{ program, fichas: [{ ficha, images: n, audios: n, videos: n, total }] }]
        """
        qs = MediaAsset.objects.values('program', 'ficha', 'media_type').all()
        tree: dict = {}
        for row in qs:
            program = row['program'] or 'Sin programa'
            ficha = row['ficha'] or 'Sin ficha'
            program_node = tree.setdefault(program, {})
            ficha_node = program_node.setdefault(ficha, {'images': 0, 'audios': 0, 'videos': 0})
            ficha_node[f"{row['media_type']}s"] += 1

        result = []
        for program, fichas in tree.items():
            ficha_list = []
            for ficha, counts in fichas.items():
                total = counts['images'] + counts['audios'] + counts['videos']
                ficha_list.append({'ficha': ficha, **counts, 'total': total})
            result.append({'program': program, 'fichas': ficha_list})
        return Response(result)

    @action(detail=False, methods=['get'], url_path='tree-by-type')
    def tree_by_type(self, request):
        """
        Árbol INVERSO: Tipo de medio -> Programa -> Ficha.
        { image: [{ program, fichas: [{ ficha, count }] }], audio: [...], video: [...] }
        """
        qs = MediaAsset.objects.values('program', 'ficha', 'media_type').all()
        tree: dict = {'image': {}, 'audio': {}, 'video': {}}

        for row in qs:
            media_type = row['media_type']
            program = row['program'] or 'Sin programa'
            ficha = row['ficha'] or 'Sin ficha'
            type_node = tree.setdefault(media_type, {})
            program_node = type_node.setdefault(program, {})
            program_node[ficha] = program_node.get(ficha, 0) + 1

        result = {}
        for media_type, programs in tree.items():
            program_list = []
            for program, fichas in programs.items():
                ficha_list = [{'ficha': ficha, 'count': count} for ficha, count in fichas.items()]
                program_list.append({'program': program, 'fichas': ficha_list})
            result[media_type] = program_list
        return Response(result)


class PronunciationEvaluationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        audio_file = request.FILES.get("audio")
        expected_text = request.data.get("expected_text", "")
        storage_path = request.data.get("storage_path", "")
        # Nuevo: nivel del quiz para organizar en carpetas A1/A2/B1/B2
        quiz_level = request.data.get("level", "")

        if not audio_file:
            return Response({"error": "Audio file is required"}, status=status.HTTP_400_BAD_REQUEST)

        if not expected_text:
            return Response({"error": "expected_text is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from users.services.quiz_service import evaluate_pronunciation_with_elevenlabs, save_audio_to_supabase
            import tempfile

            with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp_file:
                for chunk in audio_file.chunks():
                    tmp_file.write(chunk)
                tmp_path = tmp_file.name

            # Organizar audios en: {level}/user_{userId}/{filename}
            # Si viene storage_path, se respeta (compatibilidad)
            # Si viene level, se usa la nueva estructura
            if quiz_level and quiz_level in ("A1", "A2", "B1", "B2"):
                effective_storage_path = f"{quiz_level}/user_{request.user.user_id}"
            elif storage_path:
                effective_storage_path = storage_path
            else:
                effective_storage_path = f"responses/user_{request.user.user_id}"

            audio_bytes = open(tmp_path, "rb").read()
            filename = f"response-{int(timezone.now().timestamp())}.webm"
            audio_url = save_audio_to_supabase(
                audio_bytes,
                filename,
                storage_path=effective_storage_path,
            )

            evaluation = evaluate_pronunciation_with_elevenlabs(tmp_path, expected_text)

            return Response({
                "audio_url": audio_url,
                "evaluation": evaluation,
            })
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class QuizQuestionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        level = request.query_params.get("level", "A1")
        count = int(request.query_params.get("count", 5))

        # El quiz se adapta al programa del estudiante autenticado: usa
        # SU diccionario, sin importar cuál sea el programa. Si viene
        # explícito por query param (por si un docente quiere previsualizar
        # otro programa) se respeta ese valor.
        program = request.query_params.get("program", "")
        if not program:
            user_id = getattr(request.user, 'user_id', None)
            if user_id is not None:
                from ..Models.modelsSENA import User
                user_obj = User.objects.filter(pk=user_id).first()
                program = (user_obj.program or "") if user_obj else ""

        try:
            from users.services.quiz_service import build_random_quiz_from_dictionary
            questions = build_random_quiz_from_dictionary(level, count, program=program)
            return Response({"questions": questions, "program": program})
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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


class StudentAudiosView(APIView):
    """
    GET /quiz/student-audios/?user_id=XX&level=A1
    Retorna los audios de speaking de un estudiante organizados por nivel (A1/A2/B1/B2).
    Solo accesible por instructores/monitores para estudiantes de sus fichas.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_id = request.query_params.get("user_id", "")
        level = request.query_params.get("level", "")

        if not user_id:
            return Response({"error": "user_id es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        # Verificar que el solicitante sea instructor/admin o el propio estudiante
        requester_role = getattr(request.user, 'role_id', None)
        requester_id = str(request.user.user_id) if hasattr(request.user, 'user_id') else ""

        is_teacher = requester_role in ('INSTRUCTOR', 'MONITOR', 'ADMIN', 'SUPERADMIN')
        is_self = requester_id == user_id

        if not is_teacher and not is_self:
            return Response({"error": "No tienes permiso para ver estos audios"}, status=status.HTTP_403_FORBIDDEN)

        try:
            from users.services.quiz_service import list_student_audios_by_level

            audios = list_student_audios_by_level(user_id, level)
            # Contar totales
            total = sum(len(audios[lvl]) for lvl in audios)
            return Response({
                "audios": audios,
                "total": total,
                "user_id": user_id,
            })
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TestResultViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        program_filter = None
        student_ids = None
        if getattr(request.user, 'role_id', None) in {'INSTRUCTOR', 'MONITOR'}:
            student_ids = TrainingGroupStudent.objects.filter(
                group__teachers=request.user,
            ).values_list('student_id', flat=True)

        results = TestResultController.list_all(
            user_id=request.query_params.get('user_id'),
            program_filter=program_filter,
        )
        if student_ids is not None:
            allowed_ids = {str(student_id) for student_id in student_ids}
            results = [result for result in results if result['userId'] in allowed_ids]
        return Response(results)

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

        # Un instructor únicamente puede comentar resultados de aprendices de
        # las fichas a las que está asignado. Los administradores mantienen
        # el acceso global de gestión.
        if getattr(request.user, 'role_id', None) in {'INSTRUCTOR', 'MONITOR'}:
            allowed = TrainingGroupStudent.objects.filter(
                group__teachers=request.user,
                student__test_results__pk=pk,
            ).exists()
            if not allowed:
                return Response({'error': 'No tienes acceso a este resultado.'}, status=status.HTTP_403_FORBIDDEN)

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
