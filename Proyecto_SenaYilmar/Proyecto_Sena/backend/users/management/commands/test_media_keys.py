import os
import boto3
import logging
from django.core.management.base import BaseCommand
from django.conf import settings
from users.Models.modelsSENA import DigitalDictionary
from users.services.storage_service import StorageService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Diagnóstico integral y prueba directa de multimedia en MinIO y PostgreSQL"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("=" * 75))
        self.stdout.write(self.style.SUCCESS("DIAGNÓSTICO EN BUCLE DE MEDIA (VITE PROXY + MINIO CASE-SENSITIVITY)"))
        self.stdout.write(self.style.SUCCESS("=" * 75))

        s3 = StorageService.get_client()

        buckets_to_check = [
            "dictionary-images",
            "dictionary-audios",
            "exam-audios",
        ]

        # Asegurar buckets existentes
        for b in buckets_to_check:
            try:
                s3.head_bucket(Bucket=b)
            except Exception:
                try:
                    s3.create_bucket(Bucket=b)
                    self.stdout.write(f"Bucket asegurado/creado: {b}")
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"Bucket {b}: {e}"))

        # Listar contenido real de cada bucket
        bucket_contents = {}
        for b in buckets_to_check:
            keys = set()
            try:
                paginator = s3.get_paginator('list_objects_v2')
                for page in paginator.paginate(Bucket=b):
                    for obj in page.get('Contents', []):
                        keys.add(obj['Key'])
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error listando {b}: {e}"))
            bucket_contents[b] = keys
            self.stdout.write(f"Bucket [{b}]: {len(keys)} objetos encontrados.")

        images_keys = bucket_contents.get("dictionary-images", set())
        audios_keys = bucket_contents.get("dictionary-audios", set())

        # Diagnóstico específico del término "Input" (y variaciones de casing)
        self.stdout.write("\n" + self.style.WARNING("--- VERIFICACIÓN ESPECÍFICA: TÉRMINO 'INPUT' ---"))
        input_variants = [
            "input.png", "Input.png", "INPUT.png", "adso_input.png",
            "input.mp3", "Input.mp3", "INPUT.mp3", "adso_input.mp3",
        ]
        for v in input_variants:
            target_bucket = "dictionary-images" if v.endswith(".png") else "dictionary-audios"
            exists = v in bucket_contents.get(target_bucket, set())
            status_text = self.style.SUCCESS("PRESENTE") if exists else self.style.ERROR("NO EXISTE")
            self.stdout.write(f"  {target_bucket} -> {v}: {status_text}")

        # Normalización en base de datos PostgreSQL
        self.stdout.write("\n" + self.style.WARNING("--- NORMALIZACIÓN Y CASE-SENSITIVITY EN POSTGRESQL ---"))
        records = DigitalDictionary.objects.all()
        self.stdout.write(f"Total registros en DigitalDictionary: {records.count()}")

        normalized_images = 0
        normalized_audios = 0
        missing_images = []
        missing_audios = []

        # Crear diccionarios de resolución insensitive -> clave exacta en MinIO
        img_lower_map = {k.lower(): k for k in images_keys}
        aud_lower_map = {k.lower(): k for k in audios_keys}

        for rec in records:
            clean_word = (rec.word_id or "").strip().lower().replace(" ", "_")
            current_img = (rec.image or "").strip()
            current_aud = (rec.audio or "").strip()

            updated = False

            # Normalizar imagen
            exact_img = None
            if current_img in images_keys:
                exact_img = current_img
            elif current_img.lower() in img_lower_map:
                exact_img = img_lower_map[current_img.lower()]
            elif f"{clean_word}.png" in images_keys:
                exact_img = f"{clean_word}.png"
            elif f"{clean_word}.png" in img_lower_map:
                exact_img = img_lower_map[f"{clean_word}.png"]
            elif f"adso_{clean_word}.png" in images_keys:
                exact_img = f"adso_{clean_word}.png"

            if exact_img and exact_img != current_img:
                rec.image = exact_img
                updated = True
                normalized_images += 1
            elif not exact_img:
                missing_images.append((rec.id, rec.word_id, current_img))

            # Normalizar audio
            exact_aud = None
            if current_aud in audios_keys:
                exact_aud = current_aud
            elif current_aud.lower() in aud_lower_map:
                exact_aud = aud_lower_map[current_aud.lower()]
            elif f"{clean_word}.mp3" in audios_keys:
                exact_aud = f"{clean_word}.mp3"
            elif f"{clean_word}.mp3" in aud_lower_map:
                exact_aud = aud_lower_map[f"{clean_word}.mp3"]
            elif f"adso_{clean_word}.mp3" in audios_keys:
                exact_aud = f"adso_{clean_word}.mp3"

            if exact_aud and exact_aud != current_aud:
                rec.audio = exact_aud
                updated = True
                normalized_audios += 1
            elif not exact_aud:
                missing_audios.append((rec.id, rec.word_id, current_aud))

            if updated:
                rec.save(update_fields=["image", "audio"])

        self.stdout.write(self.style.SUCCESS(f"Imágenes actualizadas/normalizadas con clave exacta MinIO: {normalized_images}"))
        self.stdout.write(self.style.SUCCESS(f"Audios actualizados/normalizados con clave exacta MinIO: {normalized_audios}"))
        self.stdout.write(f"Términos sin imagen en MinIO: {len(missing_images)}")
        self.stdout.write(f"Términos sin audio en MinIO: {len(missing_audios)}")

        # Verificación directa de 'input' en BD
        input_rec = DigitalDictionary.objects.filter(word_id__iexact="input").first()
        if input_rec:
            self.stdout.write(self.style.SUCCESS(
                f"\nRegistro BD 'Input':\n"
                f"  word_id: '{input_rec.word_id}'\n"
                f"  image: '{input_rec.image}' (Existe en MinIO: {input_rec.image in images_keys})\n"
                f"  audio: '{input_rec.audio}' (Existe en MinIO: {input_rec.audio in audios_keys})"
            ))
        else:
            self.stdout.write(self.style.WARNING("Término 'input' no encontrado en DigitalDictionary."))

        self.stdout.write("\n" + self.style.SUCCESS("=" * 75))
        self.stdout.write(self.style.SUCCESS("DIAGNÓSTICO FINALIZADO CORRECTAMENTE"))
        self.stdout.write(self.style.SUCCESS("=" * 75))
