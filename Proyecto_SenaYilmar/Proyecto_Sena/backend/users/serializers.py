from collections import Counter
from rest_framework import serializers
from django.contrib.auth.hashers import make_password, check_password
from .Models.modelsSENA import Person, User, Subject, DigitalDictionary, TestResult, FichaRequest


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
            'first_name', 'last_name', 'phone_num', 'country', 'status', 'created_at'
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
    subject_name = serializers.CharField(source='subject.description', read_only=True)
    imageUrl = serializers.SerializerMethodField()
    audioUrl = serializers.SerializerMethodField()
    videoUrl = serializers.SerializerMethodField()
    
    class Meta:
        model = DigitalDictionary
        fields = [
            'id', 'word_id', 'subject', 'subject_name', 'definition',
            'synonyms', 'audio', 'video', 'image', 'level', 'competence',
            'program', 'imageUrl', 'audioUrl', 'videoUrl'
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
        return attrs
    
    def create(self, validated_data):
        # Crear Person
        person = Person.objects.create(
            email=validated_data['email'],
            password=make_password(validated_data['password']),
            doc_type=validated_data['doc_type'],
            doc_num=validated_data['doc_num'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone_num=validated_data.get('phone_num'),
            status='ACTIVO'
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
