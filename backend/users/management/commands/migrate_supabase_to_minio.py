"""
Comando de Django para migrar archivos multimedia de Supabase Storage a MinIO interno.

Uso:
    python manage.py migrate_supabase_to_minio [--dry-run]

Características:
- Idempotente: omite archivos que ya utilicen el proxy interno de Django (/api/media/...).
- Resiliente: si falla la descarga de un recurso externo, no detiene la ejecución ni destruye el registro.
- Cero pérdida: actualiza las referencias en DigitalDictionary conservando la integridad de datos.
"""

import os
import requests
from urllib.parse import urlparse
from django.core.management.base import BaseCommand
from users.Models.modelsSENA import DigitalDictionary
from users.services.storage_service import StorageService, StorageUnavailableError


class Command(BaseCommand):
    help = 'Migra archivos multimedia desde Supabase Storage a MinIO interno de manera idempotente.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Ejecuta la verificación sin realizar descargas ni cambios en la base de datos.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        self.stdout.write(self.style.NOTICE(f"Iniciando migración de Supabase a MinIO (dry_run={dry_run})..."))

        # Asegurar existencia de buckets en MinIO si no es dry-run
        if not dry_run:
            try:
                StorageService.ensure_all_buckets()
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Aviso al verificar buckets MinIO: {e}"))

        entries = DigitalDictionary.objects.all()
        total_entries = entries.count()
        self.stdout.write(f"Total de registros de diccionario a examinar: {total_entries}")

        fields_to_check = [
            ('image', 'dictionary-images'),
            ('audio', 'dictionary-audios'),
            ('video', 'dictionary-videos'),
        ]

        migrated_count = 0
        skipped_count = 0
        error_count = 0

        for item in entries:
            updated = False
            for field_name, bucket in fields_to_check:
                val = getattr(item, field_name, '') or ''
                val = val.strip()

                if not val:
                    continue

                # Si ya apunta al proxy interno de Django, es idempotente: omitir
                if val.startswith('/api/media/') or f"/api/media/{bucket}" in val:
                    skipped_count += 1
                    continue

                # Si es un enlace de Supabase o URL externa HTTP
                if 'supabase.co' in val or val.startswith('http://') or val.startswith('https://'):
                    self.stdout.write(f"Encontrado archivo externo en '{item.word_id}' ({field_name}): {val}")

                    if dry_run:
                        migrated_count += 1
                        continue

                    # Extraer o generar nombre de archivo
                    parsed_path = urlparse(val).path
                    base_filename = os.path.basename(parsed_path)
                    if not base_filename or '.' not in base_filename:
                        ext = '.jpg' if field_name == 'image' else ('.mp3' if field_name == 'audio' else '.mp4')
                        base_filename = f"{item.word_id}_{field_name}{ext}"

                    try:
                        self.stdout.write(f"  Descargando desde {val}...")
                        resp = requests.get(val, timeout=12)
                        if resp.status_code == 200:
                            content_type = resp.headers.get('content-type')
                            proxy_url = StorageService.upload_file(
                                bucket_name=bucket,
                                file_key=base_filename,
                                file_data=resp.content,
                                content_type=content_type
                            )
                            setattr(item, field_name, proxy_url)
                            updated = True
                            migrated_count += 1
                            self.stdout.write(self.style.SUCCESS(f"  -> Migrado exitosamente a proxy: {proxy_url}"))
                        else:
                            self.stdout.write(self.style.WARNING(f"  HTTP {resp.status_code} al descargar {val}. Se conserva valor actual."))
                            error_count += 1
                    except StorageUnavailableError as storage_err:
                        self.stdout.write(self.style.ERROR(f"  MinIO no disponible: {storage_err}"))
                        error_count += 1
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"  Error al migrar {val}: {e}"))
                        error_count += 1

            if updated and not dry_run:
                item.save()

        self.stdout.write(self.style.SUCCESS(
            f"\n--- Resumen de Migración ---\n"
            f"Procesados: {total_entries}\n"
            f"Migrados a MinIO: {migrated_count}\n"
            f"Omitidos (ya en proxy / vacíos): {skipped_count}\n"
            f"Errores / inaccesibles: {error_count}\n"
        ))
