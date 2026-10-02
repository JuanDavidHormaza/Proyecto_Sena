# backend/users/management/commands/create_superadmin.py
from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from users.Models.modelsSENA import Person, User


class Command(BaseCommand):
    help = 'Crea el SuperAdmin inicial si no existe'

    def handle(self, *args, **options):
        email = 'superadmin@worklex.com'
        password = 'SuperAdmin123*'

        if Person.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING('SuperAdmin ya existe, omitiendo.'))
            return

        person = Person.objects.create(
            email=email,
            password=make_password(password),
            doc_type='CC',
            doc_num='0000000000',
            first_name='Super',
            last_name='Admin',
            phone_num=None,
            status='ACTIVO',
        )

        User.objects.create(
            person=person,
            role_id='SUPERADMIN',
            status='EN_FORMACION',
            mfa='',
        )

        self.stdout.write(self.style.SUCCESS(
            f'SuperAdmin creado: {email} / {password}'
        ))