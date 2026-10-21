from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0020_person_terms'),
    ]

    operations = [
        migrations.AddField(
            model_name='digitaldictionary',
            name='spanish_translation',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='digitaldictionary',
            name='ficha',
            field=models.CharField(blank=True, db_index=True, default='', max_length=50),
        ),
    ]
