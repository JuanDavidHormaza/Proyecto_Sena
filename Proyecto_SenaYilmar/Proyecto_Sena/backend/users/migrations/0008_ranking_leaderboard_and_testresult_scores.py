from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0007_merge_0006_create_superadmin_0006_testresult_process'),
    ]

    operations = [
        # ─── Nuevos campos en TestResult para soportar los 4 quizzes ──────────
        migrations.AddField(
            model_name='testresult',
            name='speaking_score',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='testresult',
            name='writing_score',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='testresult',
            name='level_scores',
            field=models.JSONField(blank=True, null=True),
        ),

        # ─── Rediseño del modelo Ranking como leaderboard por usuario ─────────
        migrations.AlterUniqueTogether(
            name='ranking',
            unique_together=set(),
        ),
        migrations.RemoveField(model_name='ranking', name='subject'),
        migrations.RemoveField(model_name='ranking', name='word_id'),
        migrations.RemoveField(model_name='ranking', name='value'),
        migrations.AlterField(
            model_name='ranking',
            name='level',
            field=models.CharField(blank=True, max_length=10, null=True),
        ),
        migrations.AddField(
            model_name='ranking',
            name='user',
            field=models.OneToOneField(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='ranking',
                to='users.user',
            ),
        ),
        migrations.AddField(
            model_name='ranking',
            name='best_result',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='+',
                to='users.testresult',
            ),
        ),
        migrations.AddField(
            model_name='ranking',
            name='best_score',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='ranking',
            name='character',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='ranking',
            name='correct_answers',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='ranking',
            name='total_questions',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='ranking',
            name='speaking_score',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='ranking',
            name='writing_score',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='ranking',
            name='attempts',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='ranking',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AlterModelOptions(
            name='ranking',
            options={'ordering': ['-best_score', '-updated_at']},
        ),
    ]


