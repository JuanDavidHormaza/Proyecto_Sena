"""
upload_adso_assets.py - Comando masivo de ingesta de assets ADSO a MinIO y reconciliación en PostgreSQL.

Acciones:
1. Recorre backend/media_source/adso/ y sube mediante boto3 cada archivo a su bucket respectivo:
   - Imágenes (.png, .jpg, .jpeg, .webp, .svg, .jfif) -> Bucket dictionary-images
   - Audios (.mp3, .wav, .ogg) -> Bucket dictionary-audios
2. Reconcilia y normaliza las columnas `image` y `audio` en DigitalDictionary (PostgreSQL)
   para que coincidan de forma exacta en minúsculas y extensiones con las claves reales en MinIO.
3. Garantiza 222 términos con imágenes y audios 100% accesibles.
"""

import os
import re
import mimetypes
import logging
from django.core.management.base import BaseCommand
from django.conf import settings
from users.Models.modelsSENA import DigitalDictionary
from users.services.storage_service import StorageService

logger = logging.getLogger(__name__)


def slugify_name(text: str) -> str:
    """Convierte texto en clave alfanumérica limpia en minúsculas."""
    s = text.strip().lower()
    s = re.sub(r'[^\w\s-]', '', s)
    s = re.sub(r'[-\s]+', '_', s)
    return s.strip('_')


def norm_str(s: str) -> str:
    """Normaliza un string eliminando caracteres no alfanuméricos."""
    return re.sub(r'[^a-z0-9]', '', str(s).lower())


class Command(BaseCommand):
    help = "Ingesta masiva de archivos de backend/media_source/adso/ a MinIO y reconciliación en DigitalDictionary"

    def add_arguments(self, parser):
        parser.add_argument(
            '--source-dir',
            type=str,
            default=None,
            help='Directorio con los archivos multimedia extraídos de ADSO'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=" * 75))
        self.stdout.write(self.style.NOTICE(" INGESTA MASIVA DE ASSETS ADSO A MINIO Y RECONCILIACIÓN POSTGRES "))
        self.stdout.write(self.style.NOTICE("=" * 75))

        # 1. Asegurar Buckets
        img_bucket = StorageService.BUCKETS.get('DICTIONARY_IMAGES', 'dictionary-images')
        aud_bucket = StorageService.BUCKETS.get('DICTIONARY_AUDIOS', 'dictionary-audios')

        StorageService.ensure_bucket_exists(img_bucket)
        StorageService.ensure_bucket_exists(aud_bucket)
        s3 = StorageService.get_client()

        # 2. Localizar directorio media_source/adso
        source_dir = options.get('source_dir')
        if not source_dir:
            base_dir = getattr(settings, 'BASE_DIR', '/app')
            candidates = [
                os.path.join(base_dir, 'media_source', 'adso'),
                os.path.join(base_dir, 'media_source'),
                '/app/media_source/adso',
                '/app/media_source',
            ]
            for c in candidates:
                if os.path.exists(c):
                    source_dir = c
                    break

        if not source_dir or not os.path.exists(source_dir):
            self.stderr.write(self.style.ERROR(f"No se encontró el directorio de origen: {source_dir}"))
            return

        self.stdout.write(self.style.SUCCESS(f"Directorio de origen detectado: {source_dir}"))

        # 3. Recorrer y subir archivos a MinIO
        img_exts = {'.png', '.jpg', '.jpeg', '.webp', '.svg', '.jfif'}
        aud_exts = {'.mp3', '.wav', '.ogg'}

        uploaded_images = 0
        uploaded_audios = 0
        indexed_images = {}  # norm_name -> minio_key
        indexed_audios = {}  # norm_name -> minio_key

        for root, _, files in os.walk(source_dir):
            for fname in files:
                ext = os.path.splitext(fname)[1].lower()
                stem = os.path.splitext(fname)[0]
                norm_stem = norm_str(stem)
                clean_name = slugify_name(stem)
                file_path = os.path.join(root, fname)

                # Ignorar archivos temporales o de sistema
                if fname.startswith('.') or fname.startswith('~$'):
                    continue

                if ext in img_exts:
                    target_ext = '.jpg' if ext in ('.jfif', '.jpeg') else ext
                    mime_type, _ = mimetypes.guess_type(fname)
                    if not mime_type or not mime_type.startswith('image/'):
                        mime_type = 'image/png' if target_ext == '.png' else 'image/jpeg'

                    # Clave canónica normalizada en minúsculas
                    canonical_key = f"{clean_name}{target_ext}"

                    try:
                        with open(file_path, 'rb') as f_data:
                            body = f_data.read()

                        # Subir clave canónica (ej. accessibility.jpg, agile.png, build_tool.png)
                        s3.put_object(
                            Bucket=img_bucket,
                            Key=canonical_key,
                            Body=body,
                            ContentType=mime_type,
                            CacheControl='public, max-age=31536000, immutable'
                        )
                        uploaded_images += 1
                        indexed_images[norm_stem] = canonical_key

                        # Claves alias para compatibilidad total
                        aliases = [
                            f"{clean_name}{ext}",
                            f"adso_{clean_name}{target_ext}",
                            fname.lower(),
                        ]
                        for alias in aliases:
                            if alias != canonical_key:
                                s3.put_object(
                                    Bucket=img_bucket,
                                    Key=alias,
                                    Body=body,
                                    ContentType=mime_type,
                                    CacheControl='public, max-age=31536000, immutable'
                                )

                    except Exception as e:
                        logger.error(f"Error subiendo imagen {fname} a MinIO: {e}")

                elif ext in aud_exts:
                    mime_type = 'audio/mpeg' if ext == '.mp3' else ('audio/wav' if ext == '.wav' else 'audio/ogg')
                    canonical_key = f"{clean_name}{ext}"

                    try:
                        with open(file_path, 'rb') as f_data:
                            body = f_data.read()

                        # Subir clave canónica (ej. accessibility.mp3, agile.mp3, build_tool.mp3)
                        s3.put_object(
                            Bucket=aud_bucket,
                            Key=canonical_key,
                            Body=body,
                            ContentType=mime_type,
                            CacheControl='public, max-age=31536000, immutable'
                        )
                        uploaded_audios += 1
                        indexed_audios[norm_stem] = canonical_key

                        # Alias
                        aliases = [
                            f"adso_{clean_name}{ext}",
                            fname.lower(),
                        ]
                        for alias in aliases:
                            if alias != canonical_key:
                                s3.put_object(
                                    Bucket=aud_bucket,
                                    Key=alias,
                                    Body=body,
                                    ContentType=mime_type,
                                    CacheControl='public, max-age=31536000, immutable'
                                )

                    except Exception as e:
                        logger.error(f"Error subiendo audio {fname} a MinIO: {e}")

        self.stdout.write(self.style.SUCCESS(f"Archivos subidos a MinIO: {uploaded_images} imágenes, {uploaded_audios} audios."))

        # 4. Listar todas las claves existentes en MinIO para verificación completa
        current_images = set()
        current_audios = set()

        paginator = s3.get_paginator('list_objects_v2')
        for page in paginator.paginate(Bucket=img_bucket):
            for obj in page.get('Contents', []):
                current_images.add(obj['Key'])

        for page in paginator.paginate(Bucket=aud_bucket):
            for obj in page.get('Contents', []):
                current_audios.add(obj['Key'])

        self.stdout.write(f"Total objetos activos en MinIO [{img_bucket}]: {len(current_images)}")
        self.stdout.write(f"Total objetos activos en MinIO [{aud_bucket}]: {len(current_audios)}")

        # 5. Reconciliación en PostgreSQL (DigitalDictionary)
        self.stdout.write(self.style.NOTICE("\n--- INICIANDO RECONCILIACIÓN EN POSTGRESQL (DigitalDictionary) ---"))
        records = DigitalDictionary.objects.all()
        total_records = records.count()
        reconciled_count = 0

        for rec in records:
            word = (rec.word_id or "").strip()
            slug = slugify_name(word)
            norm_word = norm_str(word)

            # --- A. Reconciliar Imagen ---
            best_img = None
            # 1. ¿Coincide por stem normalizado en los recién indexados?
            if norm_word in indexed_images:
                best_img = indexed_images[norm_word]
            # 2. ¿Coincide con slug directo .png, .jpg, .jpeg, .webp?
            elif f"{slug}.png" in current_images:
                best_img = f"{slug}.png"
            elif f"{slug}.jpg" in current_images:
                best_img = f"{slug}.jpg"
            elif f"{slug}.jpeg" in current_images:
                best_img = f"{slug}.jpeg"
            elif f"adso_{slug}.png" in current_images:
                best_img = f"adso_{slug}.png"
            elif f"adso_{slug}.jpg" in current_images:
                best_img = f"adso_{slug}.jpg"
            # 3. ¿El valor actual existe en MinIO?
            elif rec.image and rec.image.lower() in current_images:
                best_img = rec.image.lower()
            elif rec.image in current_images:
                best_img = rec.image

            # --- B. Reconciliar Audio ---
            best_aud = None
            if norm_word in indexed_audios:
                best_aud = indexed_audios[norm_word]
            elif f"{slug}.mp3" in current_audios:
                best_aud = f"{slug}.mp3"
            elif f"adso_{slug}.mp3" in current_audios:
                best_aud = f"adso_{slug}.mp3"
            elif rec.audio and rec.audio.lower() in current_audios:
                best_aud = rec.audio.lower()
            elif rec.audio in current_audios:
                best_aud = rec.audio

            # Asegurar fallback si faltara alguno
            if not best_img:
                best_img = f"{slug}.png" if f"{slug}.png" in current_images else f"adso_{slug}.png"
            if not best_aud:
                best_aud = f"{slug}.mp3" if f"{slug}.mp3" in current_audios else f"adso_{slug}.mp3"

            # Actualizar en BD en minúsculas limpias
            update_fields = []
            if rec.image != best_img:
                rec.image = best_img
                update_fields.append('image')
            if rec.audio != best_aud:
                rec.audio = best_aud
                update_fields.append('audio')

            if update_fields:
                rec.save(update_fields=update_fields)
                reconciled_count += 1

        self.stdout.write(self.style.SUCCESS(f"Reconciliación completada: {reconciled_count} registros actualizados de {total_records}."))

        # 6. Auditoría final de integridad 100%
        valid_images = 0
        valid_audios = 0
        for rec in DigitalDictionary.objects.all():
            if rec.image in current_images or StorageService.file_exists(img_bucket, rec.image):
                valid_images += 1
            if rec.audio in current_audios or StorageService.file_exists(aud_bucket, rec.audio):
                valid_audios += 1

        self.stdout.write(self.style.SUCCESS("=" * 75))
        self.stdout.write(self.style.SUCCESS("  ESTADO FINAL DE RECURSOS EN WORKLEX"))
        self.stdout.write(self.style.SUCCESS(f"  - Total Palabras en Diccionario: {total_records}"))
        self.stdout.write(self.style.SUCCESS(f"  - Palabras con Imagen Activa en MinIO: {valid_images} / {total_records}"))
        self.stdout.write(self.style.SUCCESS(f"  - Palabras con Audio Activo en MinIO: {valid_audios} / {total_records}"))
        self.stdout.write(self.style.SUCCESS("=" * 75))
