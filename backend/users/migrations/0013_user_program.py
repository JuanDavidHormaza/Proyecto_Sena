from django.db import migrations, models


def set_teacher_program(apps, schema_editor):
    User = apps.get_model('users', 'User')
    User.objects.filter(
        person__email='docente@correo.com',
        role_id='INSTRUCTOR',
    ).update(program='Desarrollo de Software')


def reverse_teacher_program(apps, schema_editor):
    User = apps.get_model('users', 'User')
    User.objects.filter(person__email='docente@correo.com').update(program=None)


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0012_create_teacher_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='program',
            field=models.CharField(blank=True, max_length=120, null=True),
        ),
        migrations.RunPython(set_teacher_program, reverse_teacher_program),
    ]