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
    country = models.CharField(max_length=100, default='Colombia', blank=True, null=True)

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
         ('SUPERADMIN', 'Super Administrador'),
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
    program = models.CharField(max_length=120, null=True, blank=True)
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
    LEVEL_CHOICES = [
        ('A1', 'A1'),
        ('A2', 'A2'),
        ('B1', 'B1'),
        ('B2', 'B2'),
    ]
    COMPETENCE_CHOICES = [
        ('Speaking', 'Speaking'),
        ('Grammar', 'Grammar'),
        ('Writing', 'Writing'),
        ('Reading', 'Reading'),
    ]

    word_id = models.CharField(max_length=50)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)

    definition = models.CharField(max_length=255)
    synonyms = models.CharField(max_length=255)
    audio = models.CharField(max_length=255)
    video = models.CharField(max_length=255, null=True, blank=True)
    image = models.CharField(max_length=255)
    level = models.CharField(max_length=10, choices=LEVEL_CHOICES, default='A1', blank=True)
    competence = models.CharField(max_length=20, choices=COMPETENCE_CHOICES, default='Grammar', blank=True)
    program = models.CharField(max_length=120, default='ADSO', blank=True, null=True, db_index=True)

    class Meta:
        unique_together = ('word_id', 'subject')


class Ranking(models.Model):
    """
    Tabla de ranking (leaderboard): una fila por usuario con su mejor
    resultado obtenido en las pruebas (4 quizzes: A1, A2, B1, B2).
    Se actualiza cada vez que el usuario completa una prueba con un
    puntaje mayor al que tenía registrado.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='ranking',
        null=True,
        blank=True
    )
    best_result = models.ForeignKey(
        'TestResult',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+'
    )

    best_score = models.IntegerField(default=0)
    level = models.CharField(max_length=25, null=True, blank=True)
    character = models.CharField(max_length=50, null=True, blank=True)

    correct_answers = models.IntegerField(default=0)
    total_questions = models.IntegerField(default=0)
    speaking_score = models.IntegerField(default=0)
    writing_score = models.IntegerField(default=0)

    attempts = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-best_score', '-updated_at']

    def __str__(self):
        return f"{self.user.person.first_name} - {self.best_score}%"


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
        ('Sin Nivel', 'Sin Nivel / No Presentado'),
        ('Invalidada', 'Prueba Invalidada'),
        ('No Presentado', 'No Presentado'),
    ]

    level = models.CharField(max_length=25, choices=LEVEL_CHOICES, default='Sin Nivel')

    correct_answers = models.IntegerField()
    total_questions = models.IntegerField()

    # Puntajes específicos de las pruebas de producción
    speaking_score = models.IntegerField(default=0)
    writing_score = models.IntegerField(default=0)

    # Desglose por cada uno de los 4 quizzes (A1, A2, B1, B2)
    level_scores = models.JSONField(null=True, blank=True)

    feedback = models.TextField(null=True, blank=True)
    duration = models.CharField(max_length=20, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.person.first_name} - {self.level} ({self.score}%)"
class EmailOTP(models.Model):
    """Código de un solo uso (OTP) enviado por correo para el MFA."""
    email = models.EmailField(db_index=True)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.email} – {self.code} ({'usado' if self.used else 'activo'})"


class RegisterPendingOTP(models.Model):
    """OTP temporal para el registro + payload pendiente (sin truncar)."""

    email = models.EmailField(db_index=True)
    otp_code = models.CharField(max_length=6)

    # Payload del registro (RegisterSerializer.validated_data)
    # TextField para evitar truncamientos por límites pequeños.
    payload = models.TextField()

    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"reg:{self.email} – {self.otp_code} ({'usado' if self.used else 'activo'})"


class FichaRequest(models.Model):
    """Solicitud de vinculación a una segunda ficha o programa alterno pendiente de aprobación por el Administrador."""
    request_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ficha_requests')
    person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name='ficha_requests')
    ficha_code = models.CharField(max_length=50)
    program_name = models.CharField(max_length=200)

    STATUS_CHOICES = [
        ('PENDIENTE', 'Pendiente'),
        ('APROBADA', 'Aprobada'),
        ('RECHAZADA', 'Rechazada'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDIENTE')
    admin_notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_ficha_requests'
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Solicitud {self.ficha_code} - {self.person.first_name} {self.person.last_name} ({self.status})"
