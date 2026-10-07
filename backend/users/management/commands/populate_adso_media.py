# backend/users/management/commands/populate_adso_media.py
import zlib
import struct
import math
import io
import wave
import logging
from django.core.management.base import BaseCommand
from users.Models.modelsSENA import DigitalDictionary
from users.services.storage_service import StorageService

logger = logging.getLogger(__name__)


def generate_tech_png(word: str, level: str, width=640, height=360) -> bytes:
    """
    Genera un archivo binario PNG 16:9 claro, luminoso y profesional para la flashcard técnica.
    Utiliza una paleta moderna corporativa SENA/WorkLex (fondos claros, grilla técnica,
    marcos limpios y acentos de color según el nivel CEFR), eliminando por completo los bloques oscuros.
    """
    level_accents = {
        'A1': ((57, 169, 0), (16, 185, 129)),    # SENA Green -> Emerald
        'A2': ((14, 116, 144), (6, 182, 212)),   # Cyan / Ocean
        'B1': ((30, 58, 138), (59, 130, 246)),   # SENA Blue -> Royal
        'B2': ((109, 40, 217), (139, 92, 246)),  # Indigo / Purple
    }
    (ac1_r, ac1_g, ac1_b), (ac2_r, ac2_g, ac2_b) = level_accents.get(level.upper(), ((57, 169, 0), (16, 185, 129)))

    # Fondo claro profesional (de Slate 50 a Emerald/Cyan tint 50)
    bg_top_r, bg_top_g, bg_top_b = 248, 250, 252       # #f8fafc
    bg_bot_r, bg_bot_g, bg_bot_b = 241, 245, 249       # #f1f5f9

    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # Filter type 0
        factor_y = y / float(height)

        # Gradiente suave de fondo claro
        base_r = int(bg_top_r * (1.0 - factor_y) + bg_bot_r * factor_y)
        base_g = int(bg_top_g * (1.0 - factor_y) + bg_bot_g * factor_y)
        base_b = int(bg_top_b * (1.0 - factor_y) + bg_bot_b * factor_y)

        for x in range(width):
            # 1. Barra superior de acento corporativo (8px de altura)
            if y < 8:
                factor_x = x / float(width)
                r = int(ac1_r * (1.0 - factor_x) + ac2_r * factor_x)
                g = int(ac1_g * (1.0 - factor_x) + ac2_g * factor_x)
                b = int(ac1_b * (1.0 - factor_x) + ac2_b * factor_x)
                raw_data.extend((r, g, b))
                continue

            # 2. Marco exterior sutil (1px border)
            if x == 0 or x == width - 1 or y == height - 1:
                raw_data.extend((226, 232, 240))  # border-slate-200
                continue

            # 3. Recuadro central de ilustración técnica (Center Tech Plate)
            center_x1, center_x2 = width // 2 - 180, width // 2 + 180
            center_y1, center_y2 = height // 2 - 80, height // 2 + 80

            is_center_plate = (center_x1 <= x <= center_x2 and center_y1 <= y <= center_y2)
            is_center_border = is_center_plate and (
                x == center_x1 or x == center_x2 or y == center_y1 or y == center_y2
            )
            is_center_inner_border = is_center_plate and (
                x == center_x1 + 4 or x == center_x2 - 4 or y == center_y1 + 4 or y == center_y2 - 4
            )

            if is_center_border:
                raw_data.extend((ac1_r, ac1_g, ac1_b))
            elif is_center_inner_border:
                raw_data.extend((203, 213, 225))  # slate-300
            elif is_center_plate:
                # Placa interior blanca pura con textura técnica
                if (x + y) % 24 == 0 or (x - y) % 24 == 0:
                    raw_data.extend((241, 245, 249))
                else:
                    raw_data.extend((255, 255, 255))
            else:
                # 4. Fondo con sutil grilla técnica geométrica (cada 32px)
                is_grid_line = (x % 32 == 0 or y % 32 == 0)
                # Franjas decorativas en esquinas
                is_corner_bracket = (
                    (x in (20, 21, 50) and 20 <= y <= 50) or
                    (y in (20, 21, 50) and 20 <= x <= 50) or
                    (x in (width - 21, width - 22, width - 51) and 20 <= y <= 50) or
                    (y in (20, 21, 50) and width - 50 <= x <= width - 20)
                )

                if is_corner_bracket:
                    raw_data.extend((ac1_r, ac1_g, ac1_b))
                elif is_grid_line:
                    raw_data.extend((235, 240, 246))  # grilla suave
                else:
                    raw_data.extend((base_r, base_g, base_b))

    compressed = zlib.compress(bytes(raw_data), level=6)

    def chunk(tag: bytes, data: bytes) -> bytes:
        c = struct.pack('>I', len(data)) + tag + data
        crc = struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
        return c + crc

    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', compressed) + chunk(b'IEND', b'')


def generate_audio_sample(word: str) -> bytes:
    """
    Genera un audio WAV válido y limpio con tono melódico suave
    para que el reproductor multimedia funcione de forma consistente en el navegador.
    """
    sample_rate = 22050
    duration_sec = 1.0
    num_samples = int(sample_rate * duration_sec)

    base_freq = 280.0 + (sum(ord(c) for c in word) % 180)

    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        frames = bytearray()
        for i in range(num_samples):
            t = i / float(sample_rate)
            envelope = math.exp(-3.2 * t)
            sample_val = int(32767.0 * 0.28 * math.sin(2.0 * math.pi * base_freq * t) * envelope)
            sample_val = max(-32768, min(32767, sample_val))
            frames.extend(struct.pack('<h', sample_val))

        wav_file.writeframes(bytes(frames))

    buf.seek(0)
    return buf.read()


class Command(BaseCommand):
    help = 'Puebla y actualiza MinIO con imágenes 16:9 claras y audios para los 64 términos de ADSO'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Fuerza la sobreescritura de todas las imágenes y audios existentes en MinIO',
        )

    def handle(self, *args, **options):
        force_overwrite = options.get('force', False)
        self.stdout.write(f'Iniciando población de recursos multimedia en MinIO (force={force_overwrite})...')

        s3 = StorageService.get_client()

        # Asegurar buckets requeridos
        for bucket_key in ['DICTIONARY_IMAGES', 'DICTIONARY_AUDIOS', 'EXAM_AUDIOS', 'EXAM_SUBMISSIONS']:
            bucket_name = StorageService.BUCKETS[bucket_key]
            try:
                s3.head_bucket(Bucket=bucket_name)
            except Exception:
                try:
                    s3.create_bucket(Bucket=bucket_name)
                    self.stdout.write(self.style.SUCCESS(f'Bucket creado: {bucket_name}'))
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'Aviso verificando bucket {bucket_name}: {e}'))

        terms = DigitalDictionary.objects.all()
        if not terms.exists():
            self.stdout.write(self.style.ERROR('No hay términos en DigitalDictionary. Ejecuta import_adso_dictionary primero.'))
            return

        img_bucket = StorageService.BUCKETS['DICTIONARY_IMAGES']
        audio_bucket = StorageService.BUCKETS['DICTIONARY_AUDIOS']

        img_uploaded = 0
        audio_uploaded = 0

        for term in terms:
            level = getattr(term, 'level', 'A1') or 'A1'
            word_clean = term.word_id.strip()

            # 1. Imagen del término
            img_key = term.image.strip() if term.image else f"{word_clean.lower().replace(' ', '_')}.png"
            if not term.image:
                term.image = img_key
                term.save(update_fields=['image'])

            should_upload_img = force_overwrite
            if not should_upload_img:
                try:
                    s3.head_object(Bucket=img_bucket, Key=img_key)
                except Exception:
                    should_upload_img = True

            if should_upload_img:
                try:
                    png_bytes = generate_tech_png(word=word_clean, level=level)
                    s3.put_object(
                        Bucket=img_bucket,
                        Key=img_key,
                        Body=png_bytes,
                        ContentType='image/png'
                    )
                    img_uploaded += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Error subiendo imagen {img_key}: {e}'))

            # 2. Audio del término
            audio_key = term.audio.strip() if term.audio else f"{word_clean.lower().replace(' ', '_')}.mp3"
            if not term.audio:
                term.audio = audio_key
                term.save(update_fields=['audio'])

            should_upload_audio = force_overwrite
            if not should_upload_audio:
                try:
                    s3.head_object(Bucket=audio_bucket, Key=audio_key)
                except Exception:
                    should_upload_audio = True

            if should_upload_audio:
                try:
                    audio_bytes = generate_audio_sample(word=word_clean)
                    s3.put_object(
                        Bucket=audio_bucket,
                        Key=audio_key,
                        Body=audio_bytes,
                        ContentType='audio/wav' if audio_key.endswith('.wav') else 'audio/mpeg'
                    )
                    audio_uploaded += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Error subiendo audio {audio_key}: {e}'))

        self.stdout.write(self.style.SUCCESS(
            f'Población multimedia finalizada.\n'
            f'Total términos evaluados: {terms.count()}\n'
            f'Imágenes procesadas/cargadas: {img_uploaded}\n'
            f'Audios procesados/cargados: {audio_uploaded}'
        ))
