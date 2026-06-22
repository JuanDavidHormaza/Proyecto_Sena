from django.db import models
from django.utils import timezone


class Person(models.Model):
    person_id = models.AutoField(primary_key=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)

    DOC_TYPES = [
        ('CC', 'Cédula'),
        ('CE', 'Cédula Extranjería'),
        ('TI', 'Tarjeta Identidad'),
        ('PS', 'Pasaporte'),
        ('OT', 'Otro'),
    ]
    doc_type = models.CharField(max_length=5, choices=DOC_TYPES)
    doc_num = models.CharField(max_length=50, unique=True)

    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    phone_num = models.CharField(max_length=20, null=True, blank=True)

    PERSTATUS_CHOICES = [
        ('ACTIVO', 'Activo'),
        ('INACTIVO', 'Inactivo'),
    ]
    status = models.CharField(max_length=50, choices=PERSTATUS_CHOICES)

    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class User(models.Model):
    user_id = models.AutoField(primary_key=True)
    person = models.ForeignKey(Person, on_delete=models.CASCADE)

    ROLE_CHOICES = [
        ('ADMIN', 'Admin'),
        ('APRENDIZ', 'Aprendiz'),
        ('MONITOR', 'Monitor'),
        ('INSTRUCTOR', 'Instructor'),
    ]
    role_id = models.CharField(max_length=50, choices=ROLE_CHOICES)

    STATUS_CHOICES = [
        ('PENDIENTE', 'Pendiente Activar Cuenta'),
        ('EN_FORMACION', 'En formación'),
        ('CANCELADO', 'Cancelado'),
        ('TRASLADADO', 'Trasladado'),
        ('RETIRO', 'Retiro voluntario'),
        ('APLAZADO', 'Aplazado'),
    ]
    status = models.CharField(max_length=50, choices=STATUS_CHOICES)

    mfa = models.CharField(max_length=255)

    created_at = models.DateTimeField(default=timezone.now)


class RoleAccess(models.Model):
    role_id = models.CharField(max_length=50)
    link_id = models.CharField(max_length=50)
    status = models.CharField(max_length=50)

    class Meta:
        unique_together = ('role_id', 'link_id')


class Subject(models.Model):
    subject_id = models.CharField(max_length=50, primary_key=True)
    description = models.CharField(max_length=255)


class DigitalDictionary(models.Model):
    word_id = models.CharField(max_length=50)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)

    definition = models.CharField(max_length=255)
    synonyms = models.CharField(max_length=255)
    audio = models.CharField(max_length=255)
    video = models.CharField(max_length=255, null=True, blank=True)
    image = models.CharField(max_length=255)

    class Meta:
        unique_together = ('word_id', 'subject')


class Ranking(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    word_id = models.CharField(max_length=50)
    level = models.CharField(max_length=50)
    value = models.CharField(max_length=50)

    class Meta:
        unique_together = ('subject', 'word_id')


class Post(models.Model):
    post_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    title = models.CharField(max_length=255, null=True, blank=True)
    body = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=50)

    created_at = models.DateTimeField(auto_now_add=True)


class UserLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    transaction = models.CharField(max_length=255)
    created_at = models.DateTimeField(default=timezone.now)


class TestResult(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='test_results'
    )

    character = models.CharField(
        max_length=50,
        null=True,
        blank=True
    )
    process = models.JSONField(
    null=True,
    blank=True
)
    score = models.IntegerField()

    LEVEL_CHOICES = [
        ('A1', 'A1 - Principiante'),
        ('A2', 'A2 - Elemental'),
        ('B1', 'B1 - Intermedio'),
        ('B2', 'B2 - Intermedio Alto'),
        ('C1', 'C1 - Avanzado'),
        ('C2', 'C2 - Maestría'),
    ]

    level = models.CharField(max_length=10, choices=LEVEL_CHOICES)

    correct_answers = models.IntegerField()
    total_questions = models.IntegerField()

    feedback = models.TextField(null=True, blank=True)
    duration = models.CharField(max_length=20, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.person.first_name} - {self.level} ({self.score}%)"