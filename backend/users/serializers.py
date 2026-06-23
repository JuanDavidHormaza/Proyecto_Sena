from rest_framework import serializers
from django.contrib.auth.hashers import make_password, check_password
from .Models.modelsSENA import Person, User, Subject, DigitalDictionary, TestResult


class PersonSerializer(serializers.ModelSerializer):
    """Serializer para el modelo Person"""
    
    class Meta:
        model = Person
        fields = [
            'person_id', 'email', 'password', 'doc_type', 'doc_num',
            'first_name', 'last_name', 'phone_num', 'status', 'created_at'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'person_id': {'read_only': True},
            'created_at': {'read_only': True},
        }
    
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
    first_name = serializers.CharField(write_only=True, required=False)
    last_name = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = [
            'user_id', 'person', 'person_id', 'role_id', 'status', 'mfa', 'created_at',
            'email', 'first_name', 'last_name'
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
        fields = ['user_id', 'person', 'role_id', 'status', 'mfa', 'created_at']


class SubjectSerializer(serializers.ModelSerializer):
    """Serializer para el modelo Subject"""
    
    class Meta:
        model = Subject
        fields = ['subject_id', 'description']


class DigitalDictionarySerializer(serializers.ModelSerializer):
    """Serializer para el modelo DigitalDictionary"""
    subject_name = serializers.CharField(source='subject.description', read_only=True)
    
    class Meta:
        model = DigitalDictionary
        fields = [
            'id', 'word_id', 'subject', 'subject_name', 'definition',
            'synonyms', 'audio', 'video', 'image'
        ]


class TestResultSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = TestResult
        fields = [
            'id',
            'user',
            'user_name',
            'user_email',
            'score',
            'level',
            'character',
            'correct_answers',
            'total_questions',
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


# ─── Serializers de Autenticacion ────────────────────────────────────────────

class LoginSerializer(serializers.Serializer):
    """Serializer para el login"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class RegisterSerializer(serializers.Serializer):
    """Serializer para el registro de nuevos usuarios"""
    # Datos de Person
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    doc_type = serializers.ChoiceField(choices=Person.DOC_TYPES)
    doc_num = serializers.CharField(max_length=50)
    first_name = serializers.CharField(max_length=50)
    last_name = serializers.CharField(max_length=50)
    phone_num = serializers.IntegerField(required=False, allow_null=True)
    role_id = serializers.ChoiceField(          # ← AGREGAR ESTO
        choices=['SUPERADMIN', 'ADMIN', 'APRENDIZ', 'MONITOR', 'INSTRUCTOR'],
        default='APRENDIZ',
        required=False
    )
 


    
    def validate_email(self, value):
        if Person.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este correo ya esta registrado")
        return value
    
    def validate_doc_num(self, value):
        if Person.objects.filter(doc_num=value).exists():
            raise serializers.ValidationError("Este documento ya esta registrado")
        return value
    
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
    mfa=''
)
        
        return user


class AuthResponseSerializer(serializers.Serializer):
    """Serializer para la respuesta de autenticacion"""
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = serializers.DictField()
