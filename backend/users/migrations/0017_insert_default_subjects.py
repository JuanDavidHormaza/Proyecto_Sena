from django.db import migrations


def create_subjects(apps, schema_editor):
    Subject = apps.get_model("users", "Subject")

    subjects = [
        ("GRAMMAR", "Grammar"),
        ("SPEAKING", "Speaking"),
        ("WRITING", "Writing"),
        ("LISTENING", "Listening"),
        ("MULTIMEDIA", "Multimedia"),
    ]

    for subject_id, description in subjects:
        Subject.objects.get_or_create(
            subject_id=subject_id,
            defaults={
                "description": description
            }
        )


def delete_subjects(apps, schema_editor):
    Subject = apps.get_model("users", "Subject")

    Subject.objects.filter(
        subject_id__in=[
            "GRAMMAR",
            "SPEAKING",
            "WRITING",
            "LISTENING",
        
        ]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0016_alter_digitaldictionary_unique_together"),
    ]

    operations = [
        migrations.RunPython(
            create_subjects,
            delete_subjects,
        ),
    ]