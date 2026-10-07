# backend/users/management/commands/create_superadmin.py
import os
from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from users.Models.modelsSENA import Person, User


class Command(BaseCommand):
    help = 'Crea o sincroniza el SuperAdmin inicial de forma 100% idempotente'

    def handle(self, *args, **options):
        email = os.environ.get('SUPERADMIN_EMAIL', 'superadmin@worklex.com').strip().lower()
        password = os.environ.get('SUPERADMIN_PASSWORD', 'SuperAdmin123*')
        doc_num = '0000000000'

        person_defaults = {
            'email': email,
            'password': make_password(password),
            'doc_type': 'CC',
            'first_name': 'Super',
            'last_name': 'Admin',
            'phone_num': None,
            'status': 'ACTIVO',
        }

        # 1. Búsqueda previa por doc_num o email para evitar cualquier IntegrityError
        person = Person.objects.filter(doc_num=doc_num).first()
        if not person:
            person = Person.objects.filter(email=email).first()

        if person:
            # Sincronizar atributos asegurando doc_num y email consistentes
            person.email = email
            person.doc_num = doc_num
            person.doc_type = 'CC'
            person.status = 'ACTIVO'
            person.password = make_password(password)
            person.save()
            created_person = False
        else:
            person, created_person = Person.objects.update_or_create(
                doc_num=doc_num,
                defaults=person_defaults,
            )

        # 2. Idempotencia en User: buscar primero para evitar MultipleObjectsReturned si ya existen perfiles
        user = User.objects.filter(person=person, role_id='SUPERADMIN').first()
        if not user:
            user = User.objects.create(
                person=person,
                role_id='SUPERADMIN',
                status='EN_FORMACION',
                mfa='',
            )
            created_user = True
        else:
            if user.status != 'EN_FORMACION':
                user.status = 'EN_FORMACION'
                user.save(update_fields=['status'])
            created_user = False

        if created_person:
            self.stdout.write(self.style.SUCCESS(
                f'SuperAdmin creado exitosamente: {person.email} / {password} (doc_num={person.doc_num})'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'SuperAdmin existente sincronizado: {person.email} (doc_num={person.doc_num})'
            ))

        self.stdout.write(self.style.SUCCESS(
            f'Usuario SuperAdmin verificado (user_id={user.user_id}, role={user.role_id})'
        ))