from django.db import models
from django.contrib.auth.hashers import check_password, make_password
from rest_framework_simplejwt.tokens import RefreshToken

from django.utils import timezone
from ..Models.modelsSENA import Person, User, Subject, DigitalDictionary, TestResult, Ranking, FichaRequest


# ─── Mapas de roles y estados ────────────────────────────────────────────────

ROLE_MAP = {
    'SUPERADMIN': 'superadmin',
    'ADMIN': 'admin',
    'INSTRUCTOR': 'teacher',
    'MONITOR': 'teacher',
    'APRENDIZ': 'student',
}

ROLE_MAP_REVERSE = {
    'superadmin': 'SUPERADMIN',
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
        'superadmin': {          
            'canManageUsers': True,
            'canManageDocuments': True,
            'canViewStatistics': True,
            'canGiveFeedback': True,
            'canTakeQuiz': True,
            'canViewResults': True,
            'canManageSubjects': True,
            'canConfigureLevels': True,
        },
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
    frontend_role = ROLE_MAP.get(user.role_id)
    if not frontend_role:
        frontend_role = ROLE_MAP.get(str(user.role_id).upper(), 'student')

    phone_num = getattr(person, 'phone_num', None)
    country = getattr(person, 'country', 'Colombia') or 'Colombia'

    # Programas matriculados para esta persona
    enrolled_programs = list(
        User.objects.filter(person=person)
        .exclude(program__isnull=True)
        .exclude(program='')
        .values_list('program', flat=True)
        .distinct()
    )
    if user.program and user.program not in enrolled_programs:
        enrolled_programs.append(user.program)
    if not enrolled_programs and user.program:
        enrolled_programs = [user.program]

    # Roles disponibles para esta persona (ej. Aprendiz e Instructor)
    all_role_ids = list(
        User.objects.filter(person=person)
        .values_list('role_id', flat=True)
        .distinct()
    )
    available_roles = list(set([ROLE_MAP.get(r, 'student') for r in all_role_ids if r]))
    if frontend_role not in available_roles:
        available_roles.append(frontend_role)

    is_dual = len(available_roles) > 1 or ('student' in available_roles and 'teacher' in available_roles)

    created_at_dt = getattr(person, 'created_at', None) or getattr(user, 'created_at', None)
    created_at_str = created_at_dt.isoformat() if created_at_dt else None

    return {
        'id': str(user.user_id),
        'name': f"{person.first_name} {person.last_name}".strip(),
        'email': person.email,
        'role': frontend_role,
        'status': STATUS_MAP.get(getattr(person, 'status', None), 'inactive'),
        'permissions': get_permissions_by_role(frontend_role),
        'program': user.program,
        'enrolledPrograms': enrolled_programs,
        'availableRoles': available_roles,
        'isDualRole': is_dual,
        'country': country,
        'docType': getattr(person, 'doc_type', None),
        'docNum': getattr(person, 'doc_num', None),
        'phoneNum': phone_num,
        'firstName': getattr(person, 'first_name', ''),
        'lastName': getattr(person, 'last_name', ''),
        'createdAt': created_at_str,
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
        Registra una nueva persona + usuario, o vincula un programa alterno a una persona existente.
        Retorna (data_dict, None) en éxito o (None, error_str) en fallo.
        """
        email = validated_data.get('email', '').strip().lower()
        doc_num = validated_data.get('doc_num', '').strip()
        program = validated_data.get('program')
        is_alternate = validated_data.get('is_alternate_program', False)

        existing_person = Person.objects.filter(doc_num=doc_num).first() or Person.objects.filter(email=email).first()

        if existing_person:
            if not is_alternate:
                if Person.objects.filter(email=email).exists():
                    return None, 'Este correo ya está registrado'
                if Person.objects.filter(doc_num=doc_num).exists():
                    return None, 'Este documento ya está registrado'

            # Flujo alterno: vincular al nuevo programa sin duplicar Person
            if program and User.objects.filter(person=existing_person, program=program).exists():
                return None, f'Ya te encuentras matriculado en el programa "{program}".'

            if validated_data.get('country') and not getattr(existing_person, 'country', None):
                existing_person.country = validated_data.get('country')
                existing_person.save(update_fields=['country'])

            user = User.objects.create(
                person=existing_person,
                role_id=validated_data.get('role_id', 'APRENDIZ'),
                status='EN_FORMACION',
                program=program,
                mfa='',
            )

            access, refresh = _generate_tokens(user)
            return {
                'access': access,
                'refresh': refresh,
                'user': _build_user_response(user, existing_person),
            }, None

        # Registro primera vez
        person = Person.objects.create(
            email=email,
            password=make_password(validated_data['password']),
            doc_type=validated_data['doc_type'],
            doc_num=doc_num,
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone_num=validated_data.get('phone_num'),
            country=validated_data.get('country', 'Colombia') or 'Colombia',
            status='ACTIVO',
        )

        user = User.objects.create(
            person=person,
            role_id=validated_data.get('role_id', 'APRENDIZ'),
            status='EN_FORMACION',
            program=program,
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

        for field in ('email', 'doc_type', 'doc_num', 'first_name', 'last_name', 'phone_num', 'country', 'status'):
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
    def list_all(role_filter=None, program_filter=None):
        queryset = User.objects.select_related('person').all()
        if role_filter:
            backend_role = ROLE_MAP_REVERSE.get(role_filter, role_filter.upper())
            queryset = queryset.filter(role_id=backend_role)
        if program_filter:
            queryset = queryset.filter(program__iexact=program_filter.strip())

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

    @staticmethod
    def update_program(user_id, program):
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None, 'Usuario no encontrado'

        user.program = program or None
        user.save()
        return user.program, None

    @staticmethod
    def switch_program(user_id, program):
        try:
            user = User.objects.select_related('person').get(pk=user_id)
        except User.DoesNotExist:
            return None, 'Usuario no encontrado'

        clean_program = (program or '').strip()
        user.program = clean_program or None
        user.save(update_fields=['program'])
        return _build_user_response(user, user.person), None

    @staticmethod
    def enroll_ficha(user_id, ficha, program_name=None):
        try:
            current_user = User.objects.select_related('person').get(pk=user_id)
        except User.DoesNotExist:
            return None, 'Usuario no encontrado'

        if not ficha or not str(ficha).strip():
            return None, 'El código o número de la ficha es obligatorio'

        clean_input = str(ficha).strip()
        matched_name = None

        if program_name and str(program_name).strip():
            prog_clean = str(program_name).strip()
            if 'ficha' in prog_clean.lower():
                matched_name = prog_clean
            else:
                matched_name = f"{prog_clean} - Ficha {clean_input}"
        else:
            SENA_CATALOG = [
                {"code": "3520681", "name": "Mecánica - Ficha 3520681", "area": "Mecánica Industrial"},
                {"code": "3411643", "name": "Análisis de Datos - Ficha 3411643", "area": "Tecnologías de la Información"},
                {"code": "2670142", "name": "Desarrollo de Software - Ficha 2670142", "area": "ADSO"},
                {"code": "2710321", "name": "Redes y Telecomunicaciones - Ficha 2710321", "area": "Infraestructura TI"},
                {"code": "2554901", "name": "Producción Multimedia - Ficha 2554901", "area": "Diseño y Medios"},
                {"code": "2901412", "name": "Seguridad Informática - Ficha 2901412", "area": "Ciberseguridad"},
                {"code": "2894102", "name": "Automatización Industrial - Ficha 2894102", "area": "Mecatrónica"},
                {"code": "2689104", "name": "Gestión Empresarial - Ficha 2689104", "area": "Administración"},
                {"code": "2450912", "name": "Diseño Gráfico - Ficha 2450912", "area": "Comunicación Visual"},
                {"code": "ADSO", "name": "ADSO (Análisis y Desarrollo de Software)", "area": "Desarrollo de Software"},
            ]

            for item in SENA_CATALOG:
                if clean_input.lower() == item['code'].lower() or clean_input.lower() in item['name'].lower() or item['code'] in clean_input:
                    matched_name = item['name']
                    break

        if not matched_name:
            existing_prog = User.objects.filter(models.Q(program__icontains=clean_input)).values_list('program', flat=True).first()
            if existing_prog:
                matched_name = existing_prog
            else:
                import re
                if re.match(r'^\d{4,8}$', clean_input):
                    matched_name = f"Programa Técnico - Ficha {clean_input}"
                else:
                    return None, f"La ficha o programa '{clean_input}' no fue encontrado en el catálogo oficial SENA."

        person = current_user.person
        if User.objects.filter(person=person, program=matched_name).exists():
            return None, f"Ya te encuentras matriculado en '{matched_name}'."

        if not current_user.program:
            current_user.program = matched_name
            current_user.save(update_fields=['program'])
        else:
            User.objects.create(
                person=person,
                role_id=current_user.role_id,
                status='EN_FORMACION',
                program=matched_name,
                mfa=current_user.mfa or '',
            )
            current_user.program = matched_name
            current_user.save(update_fields=['program'])

        return _build_user_response(current_user, person), None

    @staticmethod
    def switch_role(user_id, target_role=None):
        try:
            user = User.objects.select_related('person').get(pk=user_id)
        except User.DoesNotExist:
            return None, 'Usuario no encontrado'

        current_role = user.role_id
        if target_role:
            new_backend_role = ROLE_MAP_REVERSE.get(target_role.lower(), target_role.upper())
        else:
            # Alternar entre APRENDIZ e INSTRUCTOR
            if current_role == 'APRENDIZ':
                new_backend_role = 'INSTRUCTOR'
            elif current_role in ('INSTRUCTOR', 'MONITOR'):
                new_backend_role = 'APRENDIZ'
            else:
                new_backend_role = current_role

        user.role_id = new_backend_role
        user.save(update_fields=['role_id'])
        return _build_user_response(user, user.person), None

    @staticmethod
    def delete(user_id):
        try:
            user = User.objects.get(pk=user_id)
            user.delete()
            return True, None
        except User.DoesNotExist:
            return False, 'Usuario no encontrado'


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

def _clean_media_key(val):
    """
    Extrae únicamente la clave pura del archivo (ej: 'word_1.jpg' o 'sub/word_1.jpg'),
    eliminando cualquier protocolo, host, puerto, prefijos de MinIO o de proxy.
    Garantiza que la base de datos PostgreSQL NUNCA almacene URLs completas con http/puertos.
    """
    if not val:
        return ""
    val = str(val).strip()
    if not val:
        return ""

    # Caso 1: URL completa con protocolo (http://, https://)
    if "://" in val:
        from urllib.parse import urlparse
        parsed = urlparse(val)
        val = parsed.path.lstrip('/')

    # Caso 2: Prefijo de proxy de Django (/api/media/<bucket>/<key>)
    val = val.lstrip('/')
    if val.startswith('api/media/'):
        val = val[len('api/media/'):]

    # Caso 3: Empieza por un nombre de bucket conocido
    known_buckets = (
        'dictionary-images',
        'dictionary-audios',
        'dictionary-videos',
        'exam-audios',
        'exam-submissions',
    )
    for b in known_buckets:
        if val.startswith(f"{b}/"):
            val = val[len(b) + 1:]
            break

    return val.strip('/')


class DictionaryController:

    @staticmethod
    def list_all(subject_id=None, level=None, competence=None, search=None, program=None, ficha_id=None):
        queryset = DigitalDictionary.objects.select_related('subject').all()
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        if level and level != 'all':
            queryset = queryset.filter(level=level)
        if competence and competence != 'all':
            queryset = queryset.filter(competence=competence)
        if search:
            s = search.strip().lower()
            queryset = queryset.filter(
                models.Q(word_id__icontains=s) |
                models.Q(definition__icontains=s) |
                models.Q(synonyms__icontains=s)
            )

        # Filtro inteligente por programa / ficha (Aislamiento Multi-tenant)
        target_prog = (program or ficha_id or '').strip()
        if target_prog and target_prog.lower() != 'all':
            import re
            m = re.search(r'\d{6,8}', target_prog)
            ficha_code = m.group(0) if m else None
            prog_name_clean = re.sub(r'[-\s]*\d{6,8}[-\s]*', '', target_prog).strip()

            filter_q = models.Q(program__iexact=target_prog) | models.Q(program__icontains=target_prog)
            if ficha_code:
                filter_q |= models.Q(program__icontains=ficha_code)
            if prog_name_clean:
                filter_q |= models.Q(program__icontains=prog_name_clean) | models.Q(program__iexact=prog_name_clean)

            filtered_qs = queryset.filter(filter_q)

            if not filtered_qs.exists() and any(k in target_prog.upper() for k in ['ADSO', 'SOFTWARE', 'DESARROLLO', 'PROGRAM']):
                filtered_qs = queryset.filter(models.Q(program__icontains='ADSO') | models.Q(program__icontains='SOFTWARE'))

            if filtered_qs.exists():
                queryset = filtered_qs
            else:
                adso_qs = queryset.filter(program__icontains='ADSO')
                if adso_qs.exists():
                    queryset = adso_qs

        documents = []
        for doc in queryset:
            img_key = _clean_media_key(doc.image)
            audio_key = _clean_media_key(doc.audio)
            video_key = _clean_media_key(doc.video)

            image_url = f"/api/media/dictionary-images/{img_key}" if img_key else ""
            audio_url = f"/api/media/dictionary-audios/{audio_key}" if audio_key else ""
            video_url = f"/api/media/dictionary-videos/{video_key}" if video_key else ""
            object_url = audio_url if audio_key else (video_url if video_key else "")

            subject_id = doc.subject.subject_id if doc.subject else getattr(doc, 'competence', 'Grammar')
            subject_name = doc.subject.description if doc.subject else f"Asignatura {subject_id}"

            documents.append({
                'id': str(doc.id),
                'name': doc.word_id,
                'subjectId': subject_id,
                'subjectName': subject_name,
                'program': getattr(doc, 'program', 'ADSO') or 'ADSO',
                'uploadedAt': None,
                'fileType': 'DICT',
                'size': '-',
                'uploadedBy': 'Sistema',
                'wordId': doc.word_id,
                'definition': doc.definition,
                'synonyms': doc.synonyms,
                'image': img_key,
                'audio': audio_key,
                'video': video_key,
                'imageUrl': image_url,
                'audioUrl': audio_url,
                'videoUrl': video_url,
                'objectUrl': object_url,
                'level': getattr(doc, 'level', 'A1') or 'A1',
                'competence': getattr(doc, 'competence', subject_id) or subject_id,
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
        subject_val = data.get("subject") or data.get("subjectId") or "Speaking"
        if subject_val == "ADSO":
            subject_val = "Grammar"

        try:
            subject = Subject.objects.get(pk=subject_val)
        except Subject.DoesNotExist:
            subject, _ = Subject.objects.get_or_create(
                subject_id=str(subject_val),
                defaults={"description": f"Asignatura {subject_val}"}
            )

        word_id = (data.get("word_id") or data.get("word") or data.get("name") or "").strip()
        if not word_id:
            return None, "El campo de palabra (word_id) es obligatorio"

        img_key = _clean_media_key(data.get("image") or data.get("imageUrl") or "")
        audio_key = _clean_media_key(data.get("audio") or data.get("audioUrl") or "")
        video_key = _clean_media_key(data.get("video") or data.get("videoUrl") or "")

        competence_val = data.get("competence") or subject_val
        if competence_val == "ADSO":
            competence_val = subject_val

        program_val = data.get("program") or "ADSO"

        doc = DigitalDictionary.objects.create(
            word_id=word_id,
            subject=subject,
            definition=data.get("definition", ""),
            synonyms=data.get("synonyms", ""),
            image=img_key,
            audio=audio_key,
            video=video_key,
            level=data.get("level", "A1") or "A1",
            competence=competence_val,
            program=program_val,
        )

        return doc, None

    @staticmethod
    def update(doc_id, data):
        try:
            doc = DigitalDictionary.objects.get(pk=doc_id)
        except DigitalDictionary.DoesNotExist:
            return None, 'Palabra no encontrada'

        if 'subject' in data or 'subjectId' in data:
            subject_val = data.get('subject') or data.get('subjectId')
            try:
                doc.subject = Subject.objects.get(pk=subject_val)
            except Subject.DoesNotExist:
                return None, 'Asignatura no encontrada'

        for field in ('word_id', 'definition', 'synonyms', 'level', 'competence', 'program'):
            if field in data:
                setattr(doc, field, data[field])

        if 'image' in data or 'imageUrl' in data:
            doc.image = _clean_media_key(data.get('image') or data.get('imageUrl') or '')
        if 'audio' in data or 'audioUrl' in data:
            doc.audio = _clean_media_key(data.get('audio') or data.get('audioUrl') or '')
        if 'video' in data or 'videoUrl' in data:
            doc.video = _clean_media_key(data.get('video') or data.get('videoUrl') or '')

        doc.save()
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

def _derive_level_from_score(score, total_questions=0, answered=0):
    """
    Deriva el nivel CEFR alcanzado a partir del puntaje total (0-100).
    Si el estudiante no respondió ninguna pregunta o abandona, se asigna 'Sin Nivel'.
    """
    if total_questions == 0 or (answered == 0 and score == 0):
        return 'Sin Nivel'
    if score >= 85:
        return 'B2'
    if score >= 70:
        return 'B1'
    if score >= 50:
        return 'A2'
    if score >= 20:
        return 'A1'
    return 'Sin Nivel'


def _derive_character_from_score(score, level='A1'):
    """Asigna un 'character' descriptivo según el desempeño y nivel."""
    if level in ('Sin Nivel', 'No Presentado') or score == 0:
        return 'No Presentado'
    if score >= 85:
        return 'Experto'
    if score >= 70:
        return 'Avanzado'
    if score >= 50:
        return 'Intermedio'
    return 'Principiante'


class TestResultController:

    @staticmethod
    def list_all(user_id=None, program_filter=None):
        queryset = TestResult.objects.select_related('user__person').all()
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if program_filter:
            queryset = queryset.filter(user__program__iexact=program_filter.strip())

        results = []
        for result in queryset:
            person = result.user.person
            results.append({
                'id': str(result.id),
                'userId': str(result.user.user_id),
                'userName': f"{person.first_name} {person.last_name}",
                'studentProgram': result.user.program,
                'score': result.score,
                'level': result.level,
                'character': result.character,
                'correctAnswers': result.correct_answers,
                'totalQuestions': result.total_questions,
                'speakingScore': result.speaking_score,
                'writingScore': result.writing_score,
                'levelScores': result.level_scores,
                'feedback': result.feedback,
                'duration': result.duration,
                'completedAt': result.created_at.isoformat() if result.created_at else None,
                'process': result.process,
                'answers': (result.process or {}).get('userAnswers', []),
            })
        return results

    @staticmethod
    def create(data, authenticated_user=None):
        # El frontend envía user_id; aceptamos también 'user' por compatibilidad.
        user_id = data.get('user_id', data.get('user'))
        if user_id is None and authenticated_user is not None:
            user_id = (
                getattr(authenticated_user, 'user_id', None)
                or getattr(authenticated_user, 'id', None)
                or getattr(authenticated_user, 'pk', None)
            )

        if user_id is None:
            return None, 'Usuario no encontrado'

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None, 'Usuario no encontrado'

        correct_answers = int(data.get('correct_answers', 0))
        total_questions = int(data.get('total_questions', 0)) or 0
        is_abandoned = bool(data.get('is_abandoned') or data.get('abandoned'))
        is_invalidated = bool(data.get('is_invalidated') or data.get('invalidated'))
        answered = int(data.get('answered', 0) or 0)

        # El puntaje se calcula si no viene explícito en la petición.
        score = data.get('score')
        if score is None:
            score = round((correct_answers / total_questions) * 100) if total_questions else 0
        score = int(score)

        explicit_level = (data.get('level') or '').strip()
        if is_abandoned or is_invalidated or total_questions == 0 or (correct_answers == 0 and answered == 0 and score == 0):
            level = 'Invalidada' if is_invalidated else 'No Presentado'
            character = 'No Presentado'
            score = 0
        elif explicit_level and explicit_level not in ('None', ''):
            level = explicit_level
            character = data.get('character') or _derive_character_from_score(score, level)
        else:
            level = _derive_level_from_score(score, total_questions=total_questions, answered=correct_answers)
            character = data.get('character') or _derive_character_from_score(score, level)

        result = TestResult.objects.create(
            user=user,
            score=score,
            level=level,
            character=character,
            correct_answers=correct_answers,
            total_questions=total_questions,
            speaking_score=int(data.get('speaking_score', 0) or 0),
            writing_score=int(data.get('writing_score', 0) or 0),
            level_scores=data.get('level_scores'),
            process=data.get('process'),
            feedback=data.get('feedback'),
            duration=data.get('duration'),
        )

        # Guarda / actualiza el ranking (leaderboard) del usuario solo si finalizó formalmente.
        RankingController.update_from_result(result)

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


# ─── Ranking (Leaderboard) ─────────────────────────────────────────────────────

class RankingController:

    @staticmethod
    def update_from_result(result):
        """
        Crea o actualiza la fila de ranking del usuario.
        PROTECCIÓN DEL PROMEDIO: No actualiza el ranking si la prueba fue abandonada,
        invalidada o sin nivel, asegurando que solo exámenes completados formalmente
        recalculen el nivel y promedio histórico.
        """
        if result.level in ('Sin Nivel', 'No Presentado', 'Invalidada') or result.character in ('No Presentado', 'Invalidada'):
            return None

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


class FichaRequestController:

    @staticmethod
    def create(user, ficha_code, program_name=None):
        if not ficha_code or not str(ficha_code).strip():
            return None, 'El código de ficha es obligatorio.'

        clean_input = str(ficha_code).strip()
        real_user = getattr(user, '_user', user)
        person = real_user.person

        # Catálogo oficial SENA para resolver nombre
        SENA_CATALOG = [
            {"code": "3520681", "name": "Mecánica - Ficha 3520681", "area": "Mecánica Industrial"},
            {"code": "3411643", "name": "Análisis de Datos - Ficha 3411643", "area": "Tecnologías de la Información"},
            {"code": "2670142", "name": "Desarrollo de Software - Ficha 2670142", "area": "ADSO"},
            {"code": "2710321", "name": "Redes y Telecomunicaciones - Ficha 2710321", "area": "Infraestructura TI"},
            {"code": "2554901", "name": "Producción Multimedia - Ficha 2554901", "area": "Diseño y Medios"},
            {"code": "2901412", "name": "Seguridad Informática - Ficha 2901412", "area": "Ciberseguridad"},
            {"code": "2894102", "name": "Automatización Industrial - Ficha 2894102", "area": "Mecatrónica"},
            {"code": "2689104", "name": "Gestión Empresarial - Ficha 2689104", "area": "Administración"},
            {"code": "2450912", "name": "Diseño Gráfico - Ficha 2450912", "area": "Comunicación Visual"},
            {"code": "ADSO", "name": "ADSO (Análisis y Desarrollo de Software)", "area": "Desarrollo de Software"},
        ]

        matched_name = None
        if program_name and str(program_name).strip():
            prog_clean = str(program_name).strip()
            if 'ficha' in prog_clean.lower():
                matched_name = prog_clean
            else:
                matched_name = f"{prog_clean} - Ficha {clean_input}"
        else:
            for item in SENA_CATALOG:
                if clean_input.lower() == item['code'].lower() or clean_input.lower() in item['name'].lower() or item['code'] in clean_input:
                    matched_name = item['name']
                    break

        if not matched_name:
            import re
            if re.match(r'^\d{5,9}$', clean_input):
                matched_name = f"Programa Técnico - Ficha {clean_input}"
            else:
                return None, f"El código '{clean_input}' debe ser un número de ficha válido (ej. 3520681)."

        # Verificar si el aprendiz ya está matriculado en este programa
        if User.objects.filter(person=person, program=matched_name).exists():
            return None, f"Ya te encuentras matriculado en '{matched_name}'."

        # Verificar si ya tiene una solicitud pendiente para esta ficha
        if FichaRequest.objects.filter(person=person, ficha_code=clean_input, status='PENDIENTE').exists():
            return None, f"Ya tienes una solicitud pendiente para la ficha {clean_input}."

        req = FichaRequest.objects.create(
            user=real_user,
            person=person,
            ficha_code=clean_input,
            program_name=matched_name,
            status='PENDIENTE',
        )
        return req, None

    # Alias para compatibilidad con llamadas de vistas
    request_ficha = create

    @staticmethod
    def list_all(user):
        if getattr(user, 'role_id', None) in ('ADMIN', 'SUPERADMIN'):
            return FichaRequest.objects.select_related('person', 'user', 'reviewed_by__person').all()
        return FichaRequest.objects.select_related('person', 'user', 'reviewed_by__person').filter(person=user.person)

    @staticmethod
    def approve(request_id, admin_user, instructor_id=None, notes=None):
        try:
            req = FichaRequest.objects.select_related('person', 'user').get(pk=request_id)
        except FichaRequest.DoesNotExist:
            return None, 'Solicitud no encontrada.'

        if req.status != 'PENDIENTE':
            return None, f"La solicitud ya fue procesada anteriormente con estado: {req.status}."

        real_admin = getattr(admin_user, '_user', admin_user) if admin_user else None
        req.status = 'APROBADA'
        req.reviewed_at = timezone.now()
        req.reviewed_by = real_admin

        update_fields = ['status', 'reviewed_at', 'reviewed_by']

        # Asociar instructor si fue seleccionado
        if instructor_id:
            try:
                instructor_user = User.objects.select_related('person').get(pk=instructor_id)
                inst_name = f"{instructor_user.person.first_name} {instructor_user.person.last_name}"
                req.admin_notes = f"Instructor asignado: {inst_name}. {notes or ''}".strip()
                update_fields.append('admin_notes')
            except Exception as e:
                print(f"[FICHA APPROVE] Error asociando instructor {instructor_id}: {e}")
        elif notes:
            req.admin_notes = notes
            update_fields.append('admin_notes')

        req.save(update_fields=update_fields)

        # Vincular programa al aprendiz creando/actualizando el User para esa persona
        if not User.objects.filter(person=req.person, program=req.program_name).exists():
            User.objects.create(
                person=req.person,
                role_id=req.user.role_id,
                status='EN_FORMACION',
                program=req.program_name,
                mfa=req.user.mfa or '',
            )

        return req, None

    @staticmethod
    def reject(request_id, admin_user, notes=None):
        try:
            req = FichaRequest.objects.select_related('person', 'user').get(pk=request_id)
        except FichaRequest.DoesNotExist:
            return None, 'Solicitud no encontrada.'

        if req.status != 'PENDIENTE':
            return None, f"La solicitud ya fue procesada anteriormente con estado: {req.status}."

        real_admin = getattr(admin_user, '_user', admin_user) if admin_user else None
        req.status = 'RECHAZADA'
        req.admin_notes = notes or 'Rechazada por el Administrador.'
        req.reviewed_at = timezone.now()
        req.reviewed_by = real_admin
        req.save(update_fields=['status', 'admin_notes', 'reviewed_at', 'reviewed_by'])
        return req, None
