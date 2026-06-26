from django.db import migrations


def create_teacher(apps, schema_editor):
    from django.contrib.auth.hashers import make_password

    Person = apps.get_model('users', 'Person')
    User = apps.get_model('users', 'User')

    email = 'docente@correo.com'

    if Person.objects.filter(email=email).exists():
        return

    person = Person.objects.create(
        email=email,
        password=make_password('123456'),
        doc_type='CC',
        doc_num='1111111111',
        first_name='Docente',
        last_name='SENA',
        phone_num=None,
        status='ACTIVO',
    )

    User.objects.create(
        person=person,
        role_id='INSTRUCTOR',
        status='EN_FORMACION',
        mfa='',
    )


def reverse_teacher(apps, schema_editor):
    Person = apps.get_model('users', 'Person')
    Person.objects.filter(email='docente@correo.com').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0011_registerpendingotp_alter_emailotp_id_and_more'),
    ]

    operations = [
        migrations.RunPython(create_teacher, reverse_teacher),
    ]
