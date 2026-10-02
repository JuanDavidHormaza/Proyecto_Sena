from django.db import migrations


def create_superadmin(apps, schema_editor):
    from django.contrib.auth.hashers import make_password
    Person = apps.get_model('users', 'Person')
    User = apps.get_model('users', 'User')

    email = 'superadmin@worklex.com'

    if Person.objects.filter(email=email).exists():
        return

    person = Person.objects.create(
        email=email,
        password=make_password('SuperAdmin123*'),
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


def reverse_superadmin(apps, schema_editor):
    Person = apps.get_model('users', 'Person')
    Person.objects.filter(email='superadmin@worklex.com').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_testresult_character'),
    ]

    operations = [
        migrations.RunPython(create_superadmin, reverse_superadmin),
    ]