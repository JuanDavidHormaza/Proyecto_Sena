import os
import re
import logging
from django.core.management.base import BaseCommand
from django.conf import settings
from users.Models.modelsSENA import DigitalDictionary
from users.services.storage_service import StorageService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Audita MinIO y reconcilia claves de imágenes y audios en PostgreSQL (DigitalDictionary)"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("=" * 70))
        self.stdout.write(self.style.SUCCESS("INICIANDO RECONCILIACIÓN DEFINITIVA DE MULTIMEDIA (MINIO & POSTGRES)"))
        self.stdout.write(self.style.SUCCESS("=" * 70))

        # 1. Conexión y Auditoría de MinIO
        s3 = StorageService.get_client()
        img_bucket = StorageService.BUCKETS.get("DICTIONARY_IMAGES", "dictionary-images")
        aud_bucket = StorageService.BUCKETS.get("DICTIONARY_AUDIOS", "dictionary-audios")

        # Asegurar buckets existentes
        for b in [img_bucket, aud_bucket]:
            try:
                s3.head_bucket(Bucket=b)
            except Exception:
                try:
                    s3.create_bucket(Bucket=b)
                    self.stdout.write(f"Bucket creado en MinIO: {b}")
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error asegurando bucket {b}: {e}"))

        # Listar objetos reales en MinIO
        minio_images = set()
        minio_audios = set()

        try:
            paginator = s3.get_paginator('list_objects_v2')
            for page in paginator.paginate(Bucket=img_bucket):
                for obj in page.get('Contents', []):
                    minio_images.add(obj['Key'])
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error listando {img_bucket}: {e}"))

        try:
            paginator = s3.get_paginator('list_objects_v2')
            for page in paginator.paginate(Bucket=aud_bucket):
                for obj in page.get('Contents', []):
                    minio_audios.add(obj['Key'])
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error listando {aud_bucket}: {e}"))

        self.stdout.write(f"Objetos en MinIO [{img_bucket}]: {len(minio_images)}")
        self.stdout.write(f"Objetos en MinIO [{aud_bucket}]: {len(minio_audios)}")

        # Mapas de búsqueda rápida (minúsculas y sin prefijos)
        # key_normalized -> exact_key_in_minio
        image_map = {}
        for key in minio_images:
            image_map[key] = key
            image_map[key.lower()] = key
            clean = key.lower().replace("adso_", "")
            image_map[clean] = key
            base, _ = os.path.splitext(clean)
            image_map[base] = key

        audio_map = {}
        for key in minio_audios:
            audio_map[key] = key
            audio_map[key.lower()] = key
            clean = key.lower().replace("adso_", "")
            audio_map[clean] = key
            base, _ = os.path.splitext(clean)
            audio_map[base] = key

        # 2. Búsqueda de archivos locales en disco para subir los que falten a MinIO
        project_root = getattr(settings, 'BASE_DIR', None)
        search_dirs = []
        if project_root:
            search_dirs.extend([
                os.path.join(project_root, 'media'),
                os.path.join(project_root, 'dataset'),
                os.path.join(project_root, '..', 'dataset'),
                os.path.join(project_root, '..', 'ADSO-20261001T054041Z-1-001'),
            ])

        local_files_uploaded = 0
        for s_dir in search_dirs:
            if not os.path.exists(s_dir):
                continue
            for root, _, files in os.walk(s_dir):
                for f in files:
                    ext = os.path.splitext(f)[1].lower()
                    file_path = os.path.join(root, f)
                    if ext in ['.png', '.jpg', '.jpeg', '.svg', '.webp']:
                        target_key = f.lower().replace(' ', '_')
                        if target_key not in minio_images:
                            try:
                                with open(file_path, 'rb') as fd:
                                    s3.put_object(
                                        Bucket=img_bucket,
                                        Key=target_key,
                                        Body=fd.read(),
                                        ContentType='image/png' if ext == '.png' else 'image/jpeg'
                                    )
                                minio_images.add(target_key)
                                image_map[target_key] = target_key
                                image_map[os.path.splitext(target_key)[0]] = target_key
                                local_files_uploaded += 1
                            except Exception as e:
                                logger.warning(f"No se pudo subir {f}: {e}")
                    elif ext in ['.mp3', '.wav', '.ogg']:
                        target_key = f.lower().replace(' ', '_')
                        if target_key not in minio_audios:
                            try:
                                with open(file_path, 'rb') as fd:
                                    s3.put_object(
                                        Bucket=aud_bucket,
                                        Key=target_key,
                                        Body=fd.read(),
                                        ContentType='audio/mpeg' if ext == '.mp3' else 'audio/wav'
                                    )
                                minio_audios.add(target_key)
                                audio_map[target_key] = target_key
                                audio_map[os.path.splitext(target_key)[0]] = target_key
                                local_files_uploaded += 1
                            except Exception as e:
                                logger.warning(f"No se pudo subir {f}: {e}")

        if local_files_uploaded > 0:
            self.stdout.write(self.style.SUCCESS(f"Archivos locales subidos a MinIO: {local_files_uploaded}"))

        # 3. Normalizar Claves en PostgreSQL (DigitalDictionary)
        entries = DigitalDictionary.objects.all()
        total_entries = entries.count()
        self.stdout.write(f"Total registros en DigitalDictionary: {total_entries}")

        updated_count = 0
        img_matched = 0
        aud_matched = 0
        img_missing = []
        aud_missing = []

        for item in entries:
            changed = False
            word_str = str(item.word_id or "").strip()
            word_normalized = word_str.lower().replace(" ", "_")

            # --- A. Reconciliar Imagen ---
            current_img = str(item.image or "").strip()
            # Quitar prefijos de URL si existieran
            clean_img = re.sub(r"^/api/media/[^/]+/", "", current_img).strip("/")

            best_img_key = None
            if clean_img in minio_images:
                best_img_key = clean_img
            elif clean_img.lower() in image_map:
                best_img_key = image_map[clean_img.lower()]
            elif word_normalized in image_map:
                best_img_key = image_map[word_normalized]
            elif f"{word_normalized}.png" in minio_images:
                best_img_key = f"{word_normalized}.png"
            elif f"adso_{word_normalized}.png" in minio_images:
                best_img_key = f"adso_{word_normalized}.png"
            elif f"{word_normalized}.jpg" in minio_images:
                best_img_key = f"{word_normalized}.jpg"
            elif f"adso_{word_normalized}.jpg" in minio_images:
                best_img_key = f"adso_{word_normalized}.jpg"

            if best_img_key:
                img_matched += 1
                if item.image != best_img_key:
                    item.image = best_img_key
                    changed = True
            else:
                img_missing.append(word_str)

            # --- B. Reconciliar Audio ---
            current_aud = str(item.audio or "").strip()
            clean_aud = re.sub(r"^/api/media/[^/]+/", "", current_aud).strip("/")

            best_aud_key = None
            if clean_aud in minio_audios:
                best_aud_key = clean_aud
            elif clean_aud.lower() in audio_map:
                best_aud_key = audio_map[clean_aud.lower()]
            elif word_normalized in audio_map:
                best_aud_key = audio_map[word_normalized]
            elif f"{word_normalized}.mp3" in minio_audios:
                best_aud_key = f"{word_normalized}.mp3"
            elif f"adso_{word_normalized}.mp3" in minio_audios:
                best_aud_key = f"adso_{word_normalized}.mp3"
            elif f"{word_normalized}.wav" in minio_audios:
                best_aud_key = f"{word_normalized}.wav"
            elif f"adso_{word_normalized}.wav" in minio_audios:
                best_aud_key = f"adso_{word_normalized}.wav"

            if best_aud_key:
                aud_matched += 1
                if item.audio != best_aud_key:
                    item.audio = best_aud_key
                    changed = True
            else:
                aud_missing.append(word_str)

            if changed:
                item.save(update_fields=['image', 'audio'])
                updated_count += 1

        self.stdout.write(self.style.SUCCESS("-" * 70))
        self.stdout.write(self.style.SUCCESS("RESULTADOS DE LA RECONCILIACIÓN:"))
        self.stdout.write(f"• Registros totales auditados: {total_entries}")
        self.stdout.write(f"• Imágenes con clave exacta en MinIO: {img_matched}/{total_entries} ({round(img_matched/max(total_entries,1)*100, 1)}%)")
        self.stdout.write(f"• Audios con clave exacta en MinIO: {aud_matched}/{total_entries} ({round(aud_matched/max(total_entries,1)*100, 1)}%)")
        self.stdout.write(f"• Registros actualizados en base de datos: {updated_count}")

        if img_missing:
            self.stdout.write(self.style.WARNING(f"• Imágenes sin coincidencia física ({len(img_missing)}): {img_missing[:10]}"))
        if aud_missing:
            self.stdout.write(self.style.WARNING(f"• Audios sin coincidencia física ({len(aud_missing)}): {aud_missing[:10]}"))

        self.stdout.write(self.style.SUCCESS("=" * 70))
        self.stdout.write(self.style.SUCCESS("RECONCILIACIÓN FINALIZADA CON ÉXITO"))
        self.stdout.write(self.style.SUCCESS("=" * 70))
