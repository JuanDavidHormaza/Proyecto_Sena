from django.db import migrations, models
import django.utils.timezone
 
 
class Migration(migrations.Migration):
 
    dependencies = [
        # Ajusta el nombre del archivo anterior si tu último es diferente
        ('users', '0008_ranking_leaderboard_and_testresult_scores'),
    ]
 
    operations = [
        migrations.CreateModel(
            name='EmailOTP',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('email', models.EmailField(db_index=True)),
                ('code', models.CharField(max_length=6)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('expires_at', models.DateTimeField()),
                ('used', models.BooleanField(default=False)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
 