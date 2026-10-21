from collections import Counter
from rest_framework import serializers
from django.contrib.auth.hashers import make_password, check_password
from .Models.modelsSENA import Person, User, Subject, DigitalDictionary, TestResult, FichaRequest, SupportTicket


def validate_name_anti_spam(value, field_name="Nombre"):
    val = (value or "").strip()
    if not val:
        return val
    if len(val) > 50:
        raise serializers.ValidationError(f"{field_name} no puede exceder 50 caracteres.")
    words = val.lower().split()
    if len(words) >= 3:
        counts = Counter(words)
        for w, c in counts.items():
            if c >= 3:
                raise serializers.ValidationError(f"{field_name} contiene palabras repetidas de forma consecutiva o excesiva.")
        if len(words) >= 4:
            for i in range(len(words) - 3):
                if words[i:i+2] == words[i+2:i+4]:
                    raise serializers.ValidationError(f"{field_name} contiene secuencias repetitivas de spam no válidas.")
    return val


class PersonSerializer(serializers.ModelSerializer):
    """Serializer para el modelo Person"""
    first_name = serializers.CharField(max_length=50, required=False)
    last_name = serializers.CharField(max_length=50, required=False)
    
    class Meta:
        model = Person
        fields = [
            'person_id', 'email', 'password', 'doc_type', 'doc_num',
            'first_name', 'last_name', 'phone_num', 'country', 'status', 'created_at',
            'accepted_terms', 'terms_accepted_at'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'person_id': {'read_only': True},
            'created_at': {'read_only': True},
        }

    def validate_first_name(self, value):
        return validate_name_anti_spam(value, "El nombre")

    def validate_last_name(self, value):
        return validate_name_anti_spam(value, "El apellido")
    
    def create(self, validated_data):
        # Hash the password before saving
        if 'password' in validated_data:
            validated_data['password'] = make_password(validated_data['password'])
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # Hash the password if it's being updated
        if 'password' in validated_data:
            validated_data['password'] = make_password(validated_data['password'])
        return super().update(instance, validated_data)


class UserSerializer(serializers.ModelSerializer):
    """Serializer para el modelo User con datos de Person anidados"""
    person = PersonSerializer(read_only=True)
    person_id = serializers.IntegerField(write_only=True, required=False)
    
    # Campos virtuales para facilitar la creacion
    email = serializers.EmailField(write_only=True, required=False)
    first_name = serializers.CharField(max_length=50, write_only=True, required=False)
    last_name = serializers.CharField(max_length=50, write_only=True, required=False)

    def validate_first_name(self, value):
        return validate_name_anti_spam(value, "El nombre")

    def validate_last_name(self, value):
        return validate_name_anti_spam(value, "El apellido")
    
    class Meta:
        model = User
        fields = [
            'user_id', 'person', 'person_id', 'role_id', 'status', 'mfa', 'created_at',
            'email', 'first_name', 'last_name', 'program'
        ]
        extra_kwargs = {
            'user_id': {'read_only': True},
            'created_at': {'read_only': True},
            'mfa': {'required': False},
        }


class UserDetailSerializer(serializers.ModelSerializer):
    """Serializer detallado para User con todos los datos de Person"""
    person = PersonSerializer()
    
    class Meta:
        model = User
        fields = ['user_id', 'person', 'role_id', 'status', 'mfa', 'created_at','program']


class SubjectSerializer(serializers.ModelSerializer):
    """Serializer para el modelo Subject"""
    
    class Meta:
        model = Subject
        fields = ['subject_id', 'description']


class DigitalDictionarySerializer(serializers.ModelSerializer):
    """Serializer para el modelo DigitalDictionary con URLs de streaming proxy de Django."""
    word = serializers.CharField(source='word_id', read_only=True)
    wordId = serializers.CharField(source='word_id', read_only=True)
    name = serializers.CharField(source='word_id', read_only=True)
    spanishTranslation = serializers.CharField(source='spanish_translation', read_only=True)
    subject_name = serializers.CharField(source='subject.description', read_only=True)
    imageUrl = serializers.SerializerMethodField()
    audioUrl = serializers.SerializerMethodField()
    videoUrl = serializers.SerializerMethodField()
    program = serializers.SerializerMethodField()

    def get_program(self, obj):
        p = (getattr(obj, 'program', '') or (obj.subject.description if getattr(obj, 'subject', None) else '') or (obj.subject.subject_id if getattr(obj, 'subject', None) else '')).lower()
        if 'mecanic' in p or 'mecánica' in p:
            return 'Mecánica Industrial'
        if 'multi' in p:
            return 'Producción Multimedia'
        if 'adso' in p or 'software' in p:
            return 'ADSO'
        return getattr(obj, 'program', '') or 'General' 
    
    class Meta:
        model = DigitalDictionary
        fields = [
            'id', 'word_id', 'word', 'wordId', 'name', 'subject', 'subject_name', 'definition',
            'synonyms', 'audio', 'video', 'image', 'level', 'competence',
            'program', 'spanish_translation', 'spanishTranslation', 'ficha', 'imageUrl', 'audioUrl', 'videoUrl'
        ]

    def _strip_key(self, val):
        if not val:
            return ""
        val = str(val).strip()
        if "://" in val:
            from urllib.parse import urlparse
            val = urlparse(val).path.lstrip('/')
        val = val.lstrip('/')
        if val.startswith('api/media/'):
            val = val[len('api/media/'):]
        for b in ('dictionary-images', 'dictionary-audios', 'dictionary-videos', 'exam-audios', 'exam-submissions'):
            if val.startswith(f"{b}/"):
                val = val[len(b) + 1:]
                break
        return val.strip('/')

    def get_imageUrl(self, obj):
        key = self._strip_key(obj.image)
        return f"/api/media/dictionary-images/{key}" if key else ""

    def get_audioUrl(self, obj):
        key = self._strip_key(obj.audio)
        return f"/api/media/dictionary-audios/{key}" if key else ""

    def get_videoUrl(self, obj):
        key = self._strip_key(obj.video)
        return f"/api/media/dictionary-videos/{key}" if key else ""


class TestResultSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    student_program = serializers.SerializerMethodField()

    class Meta:
        model = TestResult
        fields = [
            'id',
            'user',
            'user_name',
            'user_email',
            'student_program',
            'score',
            'level',
            'character',
            'correct_answers',
            'total_questions',
            'speaking_score',
            'writing_score',
            'level_scores',
            'feedback',
            'duration',
            'process',
            'created_at'
        ]

        extra_kwargs = {
            'id': {'read_only': True},
            'created_at': {'read_only': True},
        }

    def get_user_name(self, obj):
        return f"{obj.user.person.first_name} {obj.user.person.last_name}"

    def get_user_email(self, obj):
        return obj.user.person.email

    def get_student_program(self, obj):
        return obj.user.program

def resolve_audited_question(ans: dict) -> dict:
    """
    Normaliza y resuelve el texto explícito de respuestas seleccionadas y correctas
    para auditoría pedagógica estricta de exámenes.
    Garantiza que una pregunta sin responder NUNCA sea marcada como correcta.
    """
    if not isinstance(ans, dict):
        return {
            "question_id": 0,
            "question_text": "Pregunta no disponible",
            "type": "multiple_choice",
            "competence": "General",
            "user_answer_text": "Sin responder",
            "correct_answer_text": "N/A",
            "is_correct": False,
            "is_unanswered": True,
            "technical_term": "",
            "feedback": "Sin datos de la pregunta.",
            "options": [],
            "userAnswer": None,
            "correctAnswer": None,
            "question": "Pregunta no disponible",
            "isCorrect": False,
        }

    question_id = ans.get('questionId') or ans.get('question_id') or ans.get('id')
    question_text = ans.get('question') or ans.get('question_text') or ans.get('prompt') or ans.get('text') or 'Pregunta técnica'
    q_type = ans.get('type') or 'multiple_choice'
    competence = ans.get('competence') or ans.get('competency') or ans.get('category') or 'General'
    technical_term = ans.get('technical_term') or ans.get('wordId') or ans.get('targetWord') or ''

    options = ans.get('options')
    if not isinstance(options, list):
        options = []

    user_answer = ans.get('userAnswer')
    if user_answer is None:
        user_answer = ans.get('user_answer')

    correct_answer = ans.get('correctAnswer')
    if correct_answer is None:
        correct_answer = ans.get('correct_answer')

    writing_answer = ans.get('writingAnswer') or ans.get('writing_answer') or ''
    audio_url = ans.get('audioUrl') or ans.get('audio_url') or ''

    is_unanswered = False
    user_answer_str = ''

    if writing_answer:
        user_answer_str = str(writing_answer).strip()
    elif audio_url:
        transcription = ans.get('transcription') or ans.get('speakingTranscription')
        user_answer_str = f"Audio grabado ({transcription})" if transcription else "Audio grabado por el aprendiz"
    elif user_answer is not None and user_answer != -1 and user_answer != '':
        if isinstance(user_answer, int) or (isinstance(user_answer, str) and user_answer.lstrip('-').isdigit()):
            idx = int(user_answer)
            if 0 <= idx < len(options):
                user_answer_str = str(options[idx]).strip()
            elif idx == -1:
                is_unanswered = True
                user_answer_str = 'Sin responder'
            else:
                user_answer_str = f"Opción {idx + 1}"
        else:
            user_answer_str = str(user_answer).strip()
    else:
        is_unanswered = True
        user_answer_str = 'Sin responder'

    if not user_answer_str or user_answer_str.lower() in ('sin responder', 'n/a', 'none', 'null', '', 'opción 0', 'opción sin responder', '-1'):
        is_unanswered = True
        user_answer_str = 'Sin responder'

    correct_answer_str = ''
    if isinstance(correct_answer, int) or (isinstance(correct_answer, str) and str(correct_answer).isdigit()):
        c_idx = int(correct_answer)
        if 0 <= c_idx < len(options):
            correct_answer_str = str(options[c_idx]).strip()
        else:
            correct_answer_str = ans.get('correct_answer_text') or ans.get('targetWord') or ans.get('wordId') or f"Opción {c_idx + 1}"
    elif correct_answer:
        correct_answer_str = str(correct_answer).strip()
    else:
        correct_answer_str = ans.get('correct_answer_text') or ans.get('targetWord') or ans.get('wordId') or 'Respuesta indicada en rúbrica'

    # Regla estricta de calificación y estado:
    # Si is_unanswered == True o está sin responder, is_correct DEBE ser False
    if is_unanswered:
        is_correct = False
    else:
        raw_is_correct = ans.get('isCorrect')
        if raw_is_correct is None:
            raw_is_correct = ans.get('is_correct')

        if raw_is_correct is not None:
            is_correct = bool(raw_is_correct) and not is_unanswered
        else:
            is_correct = (user_answer_str.lower() == correct_answer_str.lower()) and not is_unanswered

    feedback = ans.get('feedback') or ans.get('rubricFeedback') or ''
    if not feedback:
        if is_unanswered:
            feedback = "El estudiante no proporcionó una respuesta antes de que finalizara el tiempo."
        elif is_correct:
            feedback = f"Respuesta correcta. Dominio adecuado del concepto técnico '{technical_term or 'evaluado'}'."
        else:
            feedback = f"Respuesta incorrecta. Se sugiere reforzar el término '{technical_term or correct_answer_str}'."

    return {
        "question_id": question_id,
        "question_text": question_text,
        "type": q_type,
        "competence": competence,
        "category": competence,
        "user_answer_text": user_answer_str,
        "correct_answer_text": correct_answer_str,
        "is_correct": is_correct,
        "is_unanswered": is_unanswered,
        "technical_term": technical_term,
        "feedback": feedback,
        "options": options,
        "userAnswer": user_answer,
        "correctAnswer": correct_answer,
        "question": question_text,
        "isCorrect": is_correct,
    }



class TestResultDetailSerializer(TestResultSerializer):
    """
    Serializer de detalle para auditoría pedagógica de exámenes.
    Entrega audit_questions con textos reales y calificación estricta.
    """
    audit_questions = serializers.SerializerMethodField()
    answers = serializers.SerializerMethodField()

    class Meta(TestResultSerializer.Meta):
        fields = TestResultSerializer.Meta.fields + ['audit_questions', 'answers']

    def get_audit_questions(self, obj):
        process = obj.process or {}
        raw_answers = process.get('userAnswers', [])
        return [resolve_audited_question(ans) for ans in raw_answers]

    def get_answers(self, obj):
        return self.get_audit_questions(obj)



# ─── Serializers de Autenticacion ────────────────────────────────────────────

class LoginSerializer(serializers.Serializer):
    """Serializer para el login"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class RegisterSerializer(serializers.Serializer):
    """Serializer para el registro de nuevos usuarios y vinculación multiprograma"""
    # Datos de Person
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    doc_type = serializers.ChoiceField(choices=Person.DOC_TYPES)
    doc_num = serializers.CharField(max_length=50)
    first_name = serializers.CharField(max_length=50)
    last_name = serializers.CharField(max_length=50)
    country = serializers.CharField(max_length=100, required=False, default='Colombia')
    program = serializers.CharField(required=False, allow_blank=True, allow_null=True)          
    phone_num = serializers.IntegerField(required=False, allow_null=True)
    role_id = serializers.ChoiceField(
        choices=['SUPERADMIN', 'ADMIN', 'APRENDIZ', 'MONITOR', 'INSTRUCTOR'],
        default='APRENDIZ',
        required=False
    )
    is_alternate_program = serializers.BooleanField(required=False, default=False)
    accepted_terms = serializers.BooleanField(required=False, default=False)

    def validate_first_name(self, value):
        return validate_name_anti_spam(value, "El nombre")

    def validate_last_name(self, value):
        return validate_name_anti_spam(value, "El apellido")

    def validate_email(self, value):
        is_alternate = bool(self.initial_data.get('is_alternate_program'))
        if not is_alternate and Person.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este correo ya esta registrado")
        return value
    
    def validate_doc_num(self, value):
        is_alternate = bool(self.initial_data.get('is_alternate_program'))
        if not is_alternate and Person.objects.filter(doc_num=value).exists():
            raise serializers.ValidationError("Este documento ya esta registrado")
        return value

    def validate(self, attrs):
        role_id = attrs.get('role_id', 'APRENDIZ')
        program = (attrs.get('program') or '').strip()

        # Programa opcional en registro inicial; aprendices vinculan fichas en perfil o alerta
        attrs['program'] = program or None
        if 'accepted_terms' in self.initial_data:
            attrs['accepted_terms'] = bool(self.initial_data['accepted_terms'])
        return attrs
    
    def create(self, validated_data):
        from django.utils import timezone
        accepted_terms = validated_data.get('accepted_terms', False)
        # Crear Person
        person = Person.objects.create(
            email=validated_data['email'],
            password=make_password(validated_data['password']),
            doc_type=validated_data['doc_type'],
            doc_num=validated_data['doc_num'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone_num=validated_data.get('phone_num'),
            status='ACTIVO',
            accepted_terms=accepted_terms,
            terms_accepted_at=timezone.now() if accepted_terms else None
        )
        
        # Crear User con rol APRENDIZ por defecto
        user = User.objects.create(
            person=person,
            role_id=validated_data['role_id'],
            status='EN_FORMACION',
            program=validated_data.get('program'),
            mfa=''
        )
        
        return user


class AuthResponseSerializer(serializers.Serializer):
    """Serializer para la respuesta de autenticacion"""
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = serializers.DictField()


class FichaRequestSerializer(serializers.ModelSerializer):
    learner_name = serializers.SerializerMethodField()
    learner_email = serializers.SerializerMethodField()
    current_program = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()
    assigned_instructor_name = serializers.SerializerMethodField()

    class Meta:
        model = FichaRequest
        fields = [
            'request_id',
            'user',
            'person',
            'learner_name',
            'learner_email',
            'current_program',
            'ficha_code',
            'program_name',
            'status',
            'admin_notes',
            'created_at',
            'reviewed_at',
            'reviewed_by',
            'reviewed_by_name',
            'assigned_instructor',
            'assigned_instructor_name',
        ]
        read_only_fields = ['request_id', 'status', 'created_at', 'reviewed_at', 'reviewed_by']

    def get_learner_name(self, obj):
        return f"{obj.person.first_name} {obj.person.last_name}"

    def get_learner_email(self, obj):
        return obj.person.email

    def get_current_program(self, obj):
        return obj.user.program or ''

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by and hasattr(obj.reviewed_by, 'person'):
            return f"{obj.reviewed_by.person.first_name} {obj.reviewed_by.person.last_name}"
        return None

    def get_assigned_instructor_name(self, obj):
        if obj.assigned_instructor and hasattr(obj.assigned_instructor, 'person'):
            return f"{obj.assigned_instructor.person.first_name} {obj.assigned_instructor.person.last_name}"
        return None


class SupportTicketSerializer(serializers.ModelSerializer):
    """Serializer para tickets de soporte / PQRS."""
    user_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    resolved_by_name = serializers.SerializerMethodField()
    screenshot_url = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicket
        fields = [
            'ticket_id',
            'user',
            'person',
            'user_name',
            'user_email',
            'user_role',
            'subject',
            'category',
            'description',
            'screenshot',
            'screenshot_url',
            'status',
            'admin_notes',
            'created_at',
            'updated_at',
            'resolved_by',
            'resolved_by_name',
        ]
        read_only_fields = ['ticket_id', 'user', 'person', 'created_at', 'updated_at', 'resolved_by']

    def get_screenshot_url(self, obj):
        if obj.screenshot:
            request = self.context.get('request')
            if request:
                try:
                    return request.build_absolute_uri(obj.screenshot.url)
                except Exception:
                    return obj.screenshot.url
            return obj.screenshot.url
        return None

    def get_user_name(self, obj):
        return f"{obj.person.first_name} {obj.person.last_name}"

    def get_user_email(self, obj):
        return obj.person.email

    def get_user_role(self, obj):
        return obj.user.role_id

    def get_resolved_by_name(self, obj):
        if obj.resolved_by and hasattr(obj.resolved_by, 'person'):
            return f"{obj.resolved_by.person.first_name} {obj.resolved_by.person.last_name}"
        return None


class ResetPasswordConfirmSerializer(serializers.Serializer):
    """Serializer para validación estricta del flujo de restablecimiento de contraseña"""
    email = serializers.EmailField(error_messages={'required': 'El correo electrónico es requerido.'})
    otp = serializers.CharField(required=False, allow_blank=True)
    code = serializers.CharField(required=False, allow_blank=True)
    new_password = serializers.CharField(
        min_length=8,
        error_messages={
            'required': 'La nueva contraseña es requerida.',
            'min_length': 'La nueva contraseña debe tener al menos 8 caracteres.'
        }
    )
    confirm_password = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        otp_val = attrs.get('otp') or attrs.get('code')
        if not otp_val or not str(otp_val).strip():
            raise serializers.ValidationError({"otp": "El código OTP de 6 dígitos es requerido."})
        attrs['otp'] = str(otp_val).strip()
        attrs['code'] = str(otp_val).strip()
        attrs['email'] = attrs['email'].strip().lower()
        return attrs

