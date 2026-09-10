from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0018_alter_digitaldictionary_unique_together'),
    ]

    operations = [
        migrations.CreateModel(
            name='TrainingGroup',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ficha', models.CharField(max_length=50, unique=True)),
                ('program', models.CharField(max_length=120)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('teachers', models.ManyToManyField(blank=True, limit_choices_to={'role_id__in': ['INSTRUCTOR', 'MONITOR']}, related_name='teaching_groups', to='users.user')),
            ],
            options={'ordering': ['ficha']},
        ),
        migrations.CreateModel(
            name='TrainingGroupStudent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('program', models.CharField(max_length=120)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('group', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='student_memberships', to='users.traininggroup')),
                ('student', models.ForeignKey(limit_choices_to={'role_id': 'APRENDIZ'}, on_delete=django.db.models.deletion.CASCADE, related_name='group_memberships', to='users.user')),
            ],
        ),
        migrations.AddConstraint(
            model_name='traininggroupstudent',
            constraint=models.UniqueConstraint(fields=('group', 'student'), name='unique_student_per_group'),
        ),
        migrations.AddConstraint(
            model_name='traininggroupstudent',
            constraint=models.UniqueConstraint(fields=('student', 'program'), name='unique_student_per_program_group'),
        ),
    ]
