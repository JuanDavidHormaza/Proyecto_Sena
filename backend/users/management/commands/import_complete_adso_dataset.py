import os
import re
import io
import zipfile
import mimetypes
import unicodedata
import logging
from typing import Optional, Dict, Tuple
from django.core.management.base import BaseCommand
import openpyxl

from users.Models.modelsSENA import DigitalDictionary, Subject
from users.services.storage_service import StorageService

logger = logging.getLogger(__name__)


def slugify_name(text: str) -> str:
    """Convierte un texto en un slug alfanumérico limpio en minúsculas."""
    s = text.strip().lower()
    s = re.sub(r'[^\w\s-]', '', s)
    s = re.sub(r'[-\s]+', '_', s)
    return s.strip('_')


def norm_str(s: str) -> str:
    """Normaliza un string para comparación flexible (solo minúsculas y dígitos)."""
    return re.sub(r'[^a-z0-9]', '', str(s).lower())


def create_svg_png_fallback(word: str) -> bytes:
    """
    Genera una imagen PNG corporativa 16:9 para palabras que carezcan de archivo físico.
    Usa estructura de imagen ligera PNG pura de 16:9 con paleta SENA.
    """
    import zlib
    import struct

    width, height = 640, 360
    # Fondo degradado slate/emerald
    raw_rows = []
    for y in range(height):
        row = [0]  # filter type 0
        r_val = int(240 + (y / height) * 12)
        g_val = int(248 + (y / height) * 5)
        b_val = int(245 + (y / height) * 8)
        for x in range(width):
            row.extend([r_val, g_val, b_val])
        raw_rows.append(bytes(row))

    compressed = zlib.compress(b''.join(raw_rows), 9)

    png = b'\x89PNG\r\n\x1a\n'
    # IHDR
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    png += struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff)
    # IDAT
    png += struct.pack('>I', len(compressed)) + b'IDAT' + compressed + struct.pack('>I', zlib.crc32(b'IDAT' + compressed) & 0xffffffff)
    # IEND
    png += struct.pack('>I', 0) + b'IEND' + struct.pack('>I', zlib.crc32(b'IEND') & 0xffffffff)
    return png


class Command(BaseCommand):
    help = "Importa masivamente el dataset completo de ADSO (ZIP/Excel + 199 audios e imágenes) a MinIO y PostgreSQL"

    def add_arguments(self, parser):
        parser.add_argument(
            '--dataset-dir',
            type=str,
            default='/app/data/adso_extracted',
            help='Ruta al directorio extraído del dataset ADSO'
        )
        parser.add_argument(
            '--zip-path',
            type=str,
            default='/app/data/ADSO-20261001T054041Z-1-001.zip',
            help='Ruta alternativa al archivo ZIP de ADSO'
        )
        parser.add_argument(
            '--force-upload',
            action='store_true',
            help='Fuerza la resubida de todos los archivos a MinIO aunque ya existan'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("════════════════════════════════════════════════════════════════"))
        self.stdout.write(self.style.NOTICE("  INICIANDO INGESTIÓN COMPLETA DEL DATASET ADSO (PRODUCCIÓN)  "))
        self.stdout.write(self.style.NOTICE("════════════════════════════════════════════════════════════════"))

        dataset_dir = options['dataset_dir']
        zip_path = options['zip_path']
        force_upload = options['force_upload']

        # 1. Asegurar existencia de directorios o extraer ZIP
        adso_root = self._locate_or_extract_dataset(dataset_dir, zip_path)
        if not adso_root:
            self.stderr.write(self.style.ERROR("No se pudo localizar ni extraer el paquete del dataset ADSO."))
            return

        self.stdout.write(self.style.SUCCESS(f"Dataset ADSO localizado en: {adso_root}"))

        # 2. Localizar subcarpetas: SONIDOS, IMÁGENES, LISTA DE PALABRAS
        sounds_dir, images_dir, excel_path = self._locate_subfolders(adso_root)
        if not excel_path:
            self.stderr.write(self.style.ERROR("No se encontró el archivo 'ADSO VOCABULARY.xlsx'."))
            return

        self.stdout.write(f"  - Carpeta de Sonidos: {sounds_dir}")
        self.stdout.write(f"  - Carpeta de Imágenes: {images_dir}")
        self.stdout.write(f"  - Archivo de Vocabulario: {excel_path}")

        # 3. Asegurar Buckets en MinIO
        StorageService.ensure_bucket_exists('dictionary-images')
        StorageService.ensure_bucket_exists('dictionary-audios')
        s3_client = StorageService.get_client()

        # 4. Asegurar Asignatura ADSO
        subject, _ = Subject.objects.get_or_create(
            subject_id='ADSO',
            defaults={'description': 'Análisis y Desarrollo de Software (SENA)'}
        )

        # 5. Indexar archivos multimedia físicos
        sound_index = self._index_files(sounds_dir) if sounds_dir else {}
        image_index = self._index_files(images_dir) if images_dir else {}

        self.stdout.write(f"Archivos físicos indexados: {len(sound_index)} audios, {len(image_index)} imágenes.")

        # 6. Leer Excel y procesar términos
        wb = openpyxl.load_workbook(excel_path, data_only=True)
        sheet = wb['ADSO'] if 'ADSO' in wb.sheetnames else wb.active
        rows = list(sheet.iter_rows(values_only=True))

        header = rows[0]
        data_rows = [r for r in rows[1:] if r and r[0]]
        self.stdout.write(self.style.NOTICE(f"Total de términos a procesar en Excel: {len(data_rows)}"))

        competences_cycle = ['Speaking', 'Grammar', 'Writing', 'Reading']
        imported_count = 0
        audios_uploaded = 0
        images_uploaded = 0
        cefr_counts = {'A1': 0, 'A2': 0, 'B1': 0, 'B2': 0}
        comp_counts = {'Speaking': 0, 'Grammar': 0, 'Writing': 0, 'Reading': 0}

        for idx, row in enumerate(data_rows):
            raw_word = str(row[0]).strip()
            if not raw_word:
                continue

            raw_def = str(row[1]).strip() if len(row) > 1 and row[1] else "Término técnico clave para ADSO."
            raw_syn = str(row[2]).strip() if len(row) > 2 and row[2] else ""
            raw_diff = row[3] if len(row) > 3 and row[3] is not None else 5.0

            # Mapeo de Dificultad a Nivel CEFR
            try:
                diff_val = float(raw_diff)
            except (ValueError, TypeError):
                diff_val = 5.0

            if diff_val <= 4.0:
                cefr_level = 'A1'
            elif diff_val <= 5.0:
                cefr_level = 'A2'
            elif diff_val <= 6.0:
                cefr_level = 'B1'
            else:
                cefr_level = 'B2'

            # Mapeo balanceado de Competencia
            competence = competences_cycle[idx % len(competences_cycle)]

            slug = slugify_name(raw_word)
            clean_word_id = raw_word[:50]

            # 7. Subida de Audio a MinIO (dictionary-audios)
            audio_filename = f"adso_{slug}.mp3"
            matched_audio_path = self._match_file(raw_word, sound_index)

            audio_data = None
            if matched_audio_path and os.path.exists(matched_audio_path):
                with open(matched_audio_path, 'rb') as af:
                    audio_data = af.read()

            if audio_data:
                try:
                    s3_client.put_object(
                        Bucket='dictionary-audios',
                        Key=audio_filename,
                        Body=audio_data,
                        ContentType='audio/mpeg',
                        CacheControl='public, max-age=86400, immutable'
                    )
                    audios_uploaded += 1
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"Error subiendo audio {audio_filename}: {e}"))
            else:
                self.stdout.write(self.style.WARNING(f"Audio no encontrado para: {raw_word}"))

            # 8. Subida de Imagen a MinIO (dictionary-images)
            matched_image_path = self._match_file(raw_word, image_index)
            if matched_image_path and os.path.exists(matched_image_path):
                img_ext = os.path.splitext(matched_image_path)[1].lower()
                if img_ext in ('.jfif', '.jpeg'):
                    img_ext = '.jpg'
                if not img_ext:
                    img_ext = '.png'
                image_filename = f"adso_{slug}{img_ext}"
                with open(matched_image_path, 'rb') as imf:
                    img_data = imf.read()
                mime_type = mimetypes.guess_type(image_filename)[0] or 'image/png'
            else:
                # Fallback corporativo si no hay archivo físico
                image_filename = f"adso_{slug}.png"
                img_data = create_svg_png_fallback(raw_word)
                mime_type = 'image/png'

            try:
                s3_client.put_object(
                    Bucket='dictionary-images',
                    Key=image_filename,
                    Body=img_data,
                    ContentType=mime_type,
                    CacheControl='public, max-age=86400, immutable'
                )
                images_uploaded += 1
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Error subiendo imagen {image_filename}: {e}"))

            # 9. Persistencia en PostgreSQL (update_or_create)
            DigitalDictionary.objects.update_or_create(
                word_id=clean_word_id,
                subject=subject,
                defaults={
                    'definition': raw_def[:255],
                    'synonyms': raw_syn[:255],
                    'audio': audio_filename,
                    'image': image_filename,
                    'video': '',
                    'level': cefr_level,
                    'competence': competence,
                }
            )

            cefr_counts[cefr_level] += 1
            comp_counts[competence] += 1
            imported_count += 1

        self.stdout.write(self.style.SUCCESS("════════════════════════════════════════════════════════════════"))
        self.stdout.write(self.style.SUCCESS(f"  INGESTIÓN FINALIZADA CON ÉXITO: {imported_count} TÉRMINOS"))
        self.stdout.write(self.style.SUCCESS("════════════════════════════════════════════════════════════════"))
        self.stdout.write(f"  - Audios subidos a MinIO (dictionary-audios): {audios_uploaded}")
        self.stdout.write(f"  - Imágenes subidas a MinIO (dictionary-images): {images_uploaded}")
        self.stdout.write(f"  - Desglose por Nivel CEFR: {cefr_counts}")
        self.stdout.write(f"  - Desglose por Competencia: {comp_counts}")

    def _locate_or_extract_dataset(self, dataset_dir: str, zip_path: str) -> Optional[str]:
        """Localiza el directorio extraído o lo descomprime si existe el ZIP."""
        # 1. ¿Ya existe dataset_dir con subcarpetas?
        if os.path.exists(dataset_dir):
            sub_adso = os.path.join(dataset_dir, 'ADSO')
            if os.path.exists(sub_adso):
                return sub_adso
            return dataset_dir

        # 2. Buscar posibles rutas del ZIP
        possible_zips = [
            zip_path,
            '/app/data/ADSO-20261001T054041Z-1-001.zip',
            '/app/ADSO-20261001T054041Z-1-001.zip',
        ]
        found_zip = None
        for p in possible_zips:
            if os.path.exists(p):
                found_zip = p
                break

        if not found_zip:
            return None

        self.stdout.write(f"Descomprimiendo {found_zip} en {dataset_dir}...")
        os.makedirs(dataset_dir, exist_ok=True)
        with zipfile.ZipFile(found_zip, 'r') as zf:
            zf.extractall(dataset_dir)

        sub_adso = os.path.join(dataset_dir, 'ADSO')
        if os.path.exists(sub_adso):
            return sub_adso
        return dataset_dir

    def _locate_subfolders(self, root: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """Busca las carpetas de sonidos, imágenes y el archivo Excel dentro del directorio."""
        sounds_dir = None
        images_dir = None
        excel_path = None

        for item in os.listdir(root):
            full_item = os.path.join(root, item)
            item_clean = unicodedata.normalize('NFKD', item).encode('ASCII', 'ignore').decode().lower()
            if os.path.isdir(full_item):
                if 'sonido' in item_clean or 'audio' in item_clean:
                    sounds_dir = full_item
                elif 'imag' in item_clean:
                    images_dir = full_item
                elif 'lista' in item_clean or 'palabra' in item_clean:
                    # Buscar excel adentro
                    for f in os.listdir(full_item):
                        if f.endswith('.xlsx'):
                            excel_path = os.path.join(full_item, f)
            elif item.endswith('.xlsx'):
                excel_path = full_item

        # Si el excel no está en la subcarpeta, buscar recursivamente
        if not excel_path:
            for r, _, files in os.walk(root):
                for f in files:
                    if f.endswith('.xlsx'):
                        excel_path = os.path.join(r, f)
                        break
                if excel_path:
                    break

        return sounds_dir, images_dir, excel_path

    def _index_files(self, folder: str) -> Dict[str, str]:
        """Crea un diccionario de búsqueda rápida: normalized_stem -> filepath."""
        index = {}
        if not folder or not os.path.exists(folder):
            return index

        for fname in os.listdir(folder):
            full_path = os.path.join(folder, fname)
            if os.path.isfile(full_path):
                stem = os.path.splitext(fname)[0]
                norm_stem = norm_str(stem)
                index[norm_stem] = full_path
                # También indexar el nombre exacto sin extensión en minúsculas
                index[stem.lower()] = full_path
        return index

    def _match_file(self, word: str, file_index: Dict[str, str]) -> Optional[str]:
        """Encuentra la mejor correspondencia de archivo para una palabra."""
        nw = norm_str(word)
        if nw in file_index:
            return file_index[nw]

        wl = word.lower()
        if wl in file_index:
            return file_index[wl]

        # Casos especiales conocidos en el dataset
        specials = {
            'api': 'apiasystemcommunicationinterface',
            'ide': 'idedevelopmentenvironment',
            'uml': 'umlmodelinglanguageforsystems',
            'feature': 'features',
        }
        if nw in specials and specials[nw] in file_index:
            return file_index[specials[nw]]

        # Búsqueda por prefijo
        for key, path in file_index.items():
            if key.startswith(nw) or nw.startswith(key):
                return path

        return None
