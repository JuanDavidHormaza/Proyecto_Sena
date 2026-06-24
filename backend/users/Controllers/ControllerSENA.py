from django.contrib.auth.hashers import check_password, make_password
from rest_framework_simplejwt.tokens import RefreshToken

from ..Models.modelsSENA import Person, User, Subject, DigitalDictionary, TestResult


# ─── Mapas de roles y estados ────────────────────────────────────────────────

ROLE_MAP = {
    'ADMIN': 'admin',
    'INSTRUCTOR': 'teacher',
    'MONITOR': 'teacher',
    'APRENDIZ': 'student',
}

ROLE_MAP_REVERSE = {
    'admin': 'ADMIN',
    'teacher': 'INSTRUCTOR',
    'student': 'APRENDIZ',
}


STATUS_MAP = {
    'ACTIVO': 'active',
    'INACTIVO': 'inactive',    'PENDIENTE': 'inactive',
    'EN_FORMACION': 'active',
    'CANCELADO': 'inactive',
    'TRASLADADO': 'inactive',
    'RETIRO': 'inactive',
    'APLAZADO': 'inactive',
}

SUBJECT_COLORS = ['#39A900', '#1F4E78', '#D89E00', '#E21B3C', '#9B59B6', '#3498DB']


def get_permissions_by_role(role):
    role_permissions = {
        'admin': {
            'canManageUsers': True,
            'canManageDocuments': True,
            'canViewStatistics': True,
            'canGiveFeedback': True,
            'canTakeQuiz': False,
            'canViewResults': True,
            'canManageSubjects': True,
            'canConfigureLevels': True,
        },
        'teacher': {
            'canManageUsers': False,
            'canManageDocuments': True,
            'canViewStatistics': True,
            'canGiveFeedback': True,
            'canTakeQuiz': False,
            'canViewResults': True,
            'canManageSubjects': False,
            'canConfigureLevels': False,
        },
        'student': {
            'canManageUsers': False,
            'canManageDocuments': False,
            'canViewStatistics': False,
            'canGiveFeedback': False,
            'canTakeQuiz': True,
            'canViewResults': True,
            'canManageSubjects': False,
            'canConfigureLevels': False,
        }
    }
    return role_permissions.get(role, role_permissions['student'])


def _build_user_response(user, person):
    """Construye el dict de usuario que espera el frontend."""
    frontend_role = ROLE_MAP.get(user.role_id, 'student')
    return {
        'id': str(user.user_id),
        'name': f"{person.first_name} {person.last_name}",
        'email': person.email,
        'role': frontend_role,
        'status': STATUS_MAP.get(person.status, 'inactive'),
        'permissions': get_permissions_by_role(frontend_role),
        'docType': person.doc_type,
        'docNum': person.doc_num,
        'phoneNum': person.phone_num,
        'firstName': person.first_name,
        'lastName': person.last_name,
    }


def _generate_tokens(user):
    """Genera par de tokens JWT para un usuario."""
    refresh = RefreshToken()
    refresh['user_id'] = user.user_id
    access = refresh.access_token
    access['user_id'] = user.user_id
    return str(access), str(refresh)


# ─── Auth ─────────────────────────────────────────────────────────────────────

class AuthController:

    @staticmethod
    def login(email, password):
        """
        Autentica un usuario.
        Retorna (data_dict, None) en éxito o (None, error_str) en fallo.
        """
        try:
            person = Person.objects.get(email=email)
        except Person.DoesNotExist:
            return None, 'Credenciales incorrectas'

        if not check_password(password, person.password):
            return None, 'Credenciales incorrectas'

        if person.status != 'ACTIVO':
            return None, 'Cuenta inactiva. Contacte al administrador.'

        user = User.objects.filter(person=person).first()
        if not user:
            return None, 'Usuario no tiene cuenta asociada'

        access, refresh = _generate_tokens(user)

        return {
            'access': access,
            'refresh': refresh,
            'user': _build_user_response(user, person),
        }, None

    @staticmethod
    def register(validated_data):
        """
        Registra una nueva persona + usuario.
        Retorna (data_dict, None) en éxito o (None, error_str) en fallo.
        """
        if Person.objects.filter(email=validated_data['email']).exists():
            return None, 'Este correo ya está registrado'

        if Person.objects.filter(doc_num=validated_data['doc_num']).exists():
            return None, 'Este documento ya está registrado'

        person = Person.objects.create(
            email=validated_data['email'],
            password=make_password(validated_data['password']),
            doc_type=validated_data['doc_type'],
            doc_num=validated_data['doc_num'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone_num=validated_data.get('phone_num'),
            status='ACTIVO',
        )

        user = User.objects.create(
            person=person,
            role_id='APRENDIZ',
            status='EN_FORMACION',
            mfa='',
        )

        access, refresh = _generate_tokens(user)

        return {
            'access': access,
            'refresh': refresh,
            'user': _build_user_response(user, person),
        }, None

    @staticmethod
    def get_me(user):
        """Devuelve el perfil del usuario autenticado."""
        return _build_user_response(user, user.person)


# ─── Persons ──────────────────────────────────────────────────────────────────

class PersonController:

    @staticmethod
    def list_all():
        return list(Person.objects.values())

    @staticmethod
    def get_by_id(person_id):
        try:
            return Person.objects.get(pk=person_id), None
        except Person.DoesNotExist:
            return None, 'Persona no encontrada'

    @staticmethod
    def create(data):
        if Person.objects.filter(email=data.get('email', '')).exists():
            return None, 'Este correo ya está registrado'
        if Person.objects.filter(doc_num=data.get('doc_num', '')).exists():
            return None, 'Este documento ya está registrado'

        person = Person.objects.create(
            email=data['email'],
            password=make_password(data['password']),
            doc_type=data['doc_type'],
            doc_num=data['doc_num'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            phone_num=data.get('phone_num'),
            status=data.get('status', 'ACTIVO'),
        )
        return person, None

    @staticmethod
    def update(person_id, data):
        try:
            person = Person.objects.get(pk=person_id)
        except Person.DoesNotExist:
            return None, 'Persona no encontrada'

        for field in ('email', 'doc_type', 'doc_num', 'first_name', 'last_name', 'phone_num', 'status'):
            if field in data:
                setattr(person, field, data[field])

        if 'password' in data:
            person.password = make_password(data['password'])

        person.save()
        return person, None

    @staticmethod
    def delete(person_id):
        try:
            person = Person.objects.get(pk=person_id)
            person.delete()
            return True, None
        except Person.DoesNotExist:
            return False, 'Persona no encontrada'


# ─── Users ────────────────────────────────────────────────────────────────────

class UserController:

    @staticmethod
    def list_all(role_filter=None):
        queryset = User.objects.select_related('person').all()
        if role_filter:
            backend_role = ROLE_MAP_REVERSE.get(role_filter, role_filter.upper())
            queryset = queryset.filter(role_id=backend_role)

        users = []
        for user in queryset:
            person = user.person
            data = _build_user_response(user, person)
            data['createdAt'] = user.created_at.isoformat() if user.created_at else None
            users.append(data)
        return users

    @staticmethod
    def get_by_id(user_id):
        try:
            user = User.objects.select_related('person').get(pk=user_id)
            return user, None
        except User.DoesNotExist:
            return None, 'Usuario no encontrado'

    @staticmethod
    def toggle_status(user_id):
        try:
            user = User.objects.select_related('person').get(pk=user_id)
        except User.DoesNotExist:
            return None, 'Usuario no encontrado'

        person = user.person
        person.status = 'INACTIVO' if person.status == 'ACTIVO' else 'ACTIVO'
        person.save()
        return STATUS_MAP.get(person.status, 'inactive'), None

    @staticmethod
    def change_role(user_id, new_frontend_role):
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None, 'Usuario no encontrado'

        backend_role = ROLE_MAP_REVERSE.get(new_frontend_role, 'APRENDIZ')
        user.role_id = backend_role
        user.save()
        return new_frontend_role, None


# ─── Subjects ─────────────────────────────────────────────────────────────────

class SubjectController:

    @staticmethod
    def list_all():
        subjects = []
        for i, subject in enumerate(Subject.objects.all()):
            subjects.append({
                'id': subject.subject_id,
                'name': subject.subject_id,
                'description': subject.description,
                'color': SUBJECT_COLORS[i % len(SUBJECT_COLORS)],
                'createdAt': None,
            })
        return subjects

    @staticmethod
    def get_by_id(subject_id):
        try:
            return Subject.objects.get(pk=subject_id), None
        except Subject.DoesNotExist:
            return None, 'Asignatura no encontrada'

    @staticmethod
    def create(data):
        subject_id = data.get('name', data.get('subject_id'))
        if not subject_id:
            return None, 'El campo name/subject_id es obligatorio'

        if Subject.objects.filter(pk=subject_id).exists():
            return None, 'Ya existe una asignatura con ese id'

        subject = Subject.objects.create(
            subject_id=subject_id,
            description=data.get('description', ''),
        )
        return {
            'id': subject.subject_id,
            'name': subject.subject_id,
            'description': subject.description,
            'color': SUBJECT_COLORS[0],
            'createdAt': None,
        }, None

    @staticmethod
    def delete(subject_id):
        try:
            subject = Subject.objects.get(pk=subject_id)
            subject.delete()
            return True, None
        except Subject.DoesNotExist:
            return False, 'Asignatura no encontrada'


# ─── DigitalDictionary ────────────────────────────────────────────────────────

class DictionaryController:

    @staticmethod
    def list_all(subject_id=None):
        queryset = DigitalDictionary.objects.select_related('subject').all()
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)

        documents = []
        for doc in queryset:
            documents.append({
                'id': str(doc.id),
                'name': doc.word_id,
                'subjectId': doc.subject.subject_id if doc.subject else None,
                'subjectName': doc.subject.description if doc.subject else 'Sin asignar',
                'program': 'Todos los programas',
                'uploadedAt': None,
                'fileType': 'DICT',
                'size': '-',
                'uploadedBy': 'Sistema',
                'wordId': doc.word_id,
                'definition': doc.definition,
                'synonyms': doc.synonyms,
                'audioUrl': doc.audio,
                'videoUrl': doc.video,
                'imageUrl': doc.image,
            })
        return documents

    @staticmethod
    def get_by_id(doc_id):
        try:
            return DigitalDictionary.objects.select_related('subject').get(pk=doc_id), None
        except DigitalDictionary.DoesNotExist:
            return None, 'Palabra no encontrada'

    @staticmethod
    def create(data):
        try:
            subject = Subject.objects.get(pk=data['subject'])
        except Subject.DoesNotExist:
            return None, 'Asignatura no encontrada'

        doc = DigitalDictionary.objects.create(
            word_id=data['word_id'],
            subject=subject,
            definition=data['definition'],
            synonyms=data['synonyms'],
            audio=data['audio'],
            video=data.get('video'),
            image=data['image'],
        )
        return doc, None

    @staticmethod
    def delete(doc_id):
        try:
            doc = DigitalDictionary.objects.get(pk=doc_id)
            doc.delete()
            return True, None
        except DigitalDictionary.DoesNotExist:
            return False, 'Palabra no encontrada'


# ─── TestResults ──────────────────────────────────────────────────────────────

class TestResultController:

    @staticmethod
    def list_all(user_id=None):
        queryset = TestResult.objects.select_related('user__person').all()
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        results = []
        for result in queryset:
            person = result.user.person
            results.append({
                'id': str(result.id),
                'userId': str(result.user.user_id),
                'userName': f"{person.first_name} {person.last_name}",
                'score': result.score,
                'level': result.level,
                'correctAnswers': result.correct_answers,
                'totalQuestions': result.total_questions,
                'feedback': result.feedback,
                'duration': result.duration,
                'completedAt': result.created_at.isoformat() if result.created_at else None,
                'answers': [],
            })
        return results

    @staticmethod
    def create(data):
        try:
            user = User.objects.get(pk=data['user'])
        except User.DoesNotExist:
            return None, 'Usuario no encontrado'

        result = TestResult.objects.create(
            user=user,
            score=data['score'],
            level=data['level'],
            correct_answers=data['correct_answers'],
            total_questions=data['total_questions'],
            feedback=data.get('feedback'),
            duration=data.get('duration'),
        )
<<<<<<< Updated upstream
=======

        # Guarda / actualiza el ranking (leaderboard) del usuario.
        RankingController.update_from_result(result)

        # ── Notificar a los instructores por correo ──────────────────────────
        try:
            from django.core.mail import send_mail
            from django.conf import settings as django_settings

            instructor_emails = list(
                User.objects.filter(role_id='INSTRUCTOR')
                .values_list('person__email', flat=True)
            )

            if instructor_emails:
                aprendiz_name = (
                    f"{user.person.first_name} {user.person.last_name}".strip()
                )
                duration_str = data.get('duration', 'N/A')
                subject_line = (
                    f"[WorkLex] Resultado de prueba: {aprendiz_name}"
                )
                body = (
                    f"El aprendiz {aprendiz_name} completó la prueba de inglés.\n\n"
                    f"Nivel asignado : {level}\n"
                    f"Puntaje        : {score}%\n"
                    f"Respuestas correctas: {correct_answers}/{total_questions}\n"
                    f"Duración       : {duration_str}\n\n"
                    f"Ingresa al dashboard de instructores para ver el detalle completo "
                    f"y dejar retroalimentación."
                )
                send_mail(
                    subject=subject_line,
                    message=body,
                    from_email=getattr(django_settings, 'DEFAULT_FROM_EMAIL', ''),
                    recipient_list=instructor_emails,
                    fail_silently=True,
                )
        except Exception as _email_exc:
            # El error de email nunca debe interrumpir el guardado del resultado
            print(f"[WorkLex] Error al notificar instructores: {_email_exc}")

>>>>>>> Stashed changes
        return result, None

    @staticmethod
    def add_feedback(result_id, feedback):
        try:
            result = TestResult.objects.get(pk=result_id)
        except TestResult.DoesNotExist:
            return None, 'Resultado no encontrado'

        result.feedback = feedback
        result.save()
        return result, None
<<<<<<< Updated upstream
=======


# ─── Ranking (Leaderboard) ─────────────────────────────────────────────────────

class RankingController:

    @staticmethod
    def update_from_result(result):
        """
        Crea o actualiza la fila de ranking del usuario.
        Solo sobreescribe el mejor resultado si el nuevo puntaje es mayor
        o igual al registrado previamente.
        """
        ranking, created = Ranking.objects.get_or_create(
            user=result.user,
            defaults={
                'best_result': result,
                'best_score': result.score,
                'level': result.level,
                'character': result.character,
                'correct_answers': result.correct_answers,
                'total_questions': result.total_questions,
                'speaking_score': result.speaking_score,
                'writing_score': result.writing_score,
                'attempts': 1,
            },
        )

        if not created:
            ranking.attempts += 1
            if result.score >= ranking.best_score:
                ranking.best_result = result
                ranking.best_score = result.score
                ranking.level = result.level
                ranking.character = result.character
                ranking.correct_answers = result.correct_answers
                ranking.total_questions = result.total_questions
                ranking.speaking_score = result.speaking_score
                ranking.writing_score = result.writing_score
            ranking.save()

        return ranking

    @staticmethod
    def list_all():
        """Devuelve el leaderboard ordenado por mejor puntaje."""
        queryset = (
            Ranking.objects
            .select_related('user__person', 'best_result')
            .order_by('-best_score', '-updated_at')
        )

        leaderboard = []
        for position, ranking in enumerate(queryset, start=1):
            person = ranking.user.person
            leaderboard.append({
                'position': position,
                'userId': str(ranking.user.user_id),
                'userName': f"{person.first_name} {person.last_name}",
                'bestScore': ranking.best_score,
                'level': ranking.level,
                'character': ranking.character,
                'correctAnswers': ranking.correct_answers,
                'totalQuestions': ranking.total_questions,
                'speakingScore': ranking.speaking_score,
                'writingScore': ranking.writing_score,
                'attempts': ranking.attempts,
                'bestResultId': str(ranking.best_result.id) if ranking.best_result else None,
                'updatedAt': ranking.updated_at.isoformat() if ranking.updated_at else None,
            })
        return leaderboard
>>>>>>> Stashed changes
