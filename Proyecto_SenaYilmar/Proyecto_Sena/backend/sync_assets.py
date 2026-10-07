import os
import sys
import urllib.request
import urllib.parse
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.services.storage_service import StorageService
from users.Models.modelsSENA import DigitalDictionary

s3 = StorageService.get_client()
aud_bucket = 'dictionary-audios'
img_bucket = 'dictionary-images'

missing_terms = [
    'Output', 'File', 'Screen', 'Icon', 'Click', 'Password', 'Condition', 'Return',
    'Parameter', 'Button', 'Code', 'Input', 'Migration', 'Inheritance', 'Exception',
    'Encapsulation', 'Continuous Integration', 'Scalability', 'Polymorphism',
    'Vulnerability', 'Asynchronous', 'Virtualization', 'Observability', 'Throughput',
    'Microservices', 'Refactoring Pattern'
]

print(f"Generating and uploading media for {len(missing_terms)} terms...")

# Fallback image template in SVG
svg_template = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="32" fill="#0f172a"/>
  <rect x="16" y="16" width="480" height="480" rx="24" fill="none" stroke="#10b981" stroke-width="6" stroke-dasharray="12 6"/>
  <rect x="156" y="48" width="200" height="44" rx="12" fill="#10b981"/>
  <text x="256" y="77" font-family="system-ui, sans-serif" font-size="18" font-weight="bold" fill="#ffffff" text-anchor="middle">SENA ADSO</text>
  <circle cx="256" cy="220" r="80" fill="#1e293b" stroke="#10b981" stroke-width="4"/>
  <path d="M230 200 L256 175 L282 200 M256 175 L256 265" stroke="#10b981" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="256" y="360" font-family="system-ui, sans-serif" font-size="28" font-weight="bold" fill="#f8fafc" text-anchor="middle">_WORD_</text>
  <text x="256" y="400" font-family="system-ui, sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">English Technical Vocabulary</text>
</svg>"""

for word in missing_terms:
    slug = word.lower().replace(' ', '_')
    
    # 1. Audio via Google Translate TTS
    try:
        query = urllib.parse.quote(word)
        tts_url = f"https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q={query}"
        req = urllib.request.Request(tts_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            audio_bytes = resp.read()
            for key in [f"{slug}.mp3", f"adso_{slug}.mp3"]:
                s3.put_object(
                    Bucket=aud_bucket,
                    Key=key,
                    Body=audio_bytes,
                    ContentType='audio/mpeg',
                    CacheControl='public, max-age=31536000, immutable'
                )
        print(f"  [AUDIO OK] {word} -> {slug}.mp3 ({len(audio_bytes)} bytes)")
    except Exception as e:
        print(f"  [AUDIO ERROR] {word}: {e}")

    # 2. Image badge SVG and aliases
    try:
        svg_content = svg_template.replace('_WORD_', word).encode('utf-8')
        for key in [f"{slug}.png", f"adso_{slug}.png", f"{slug}.jpg", f"adso_{slug}.jpg", f"{slug}.svg", f"adso_{slug}.svg"]:
            s3.put_object(
                Bucket=img_bucket,
                Key=key,
                Body=svg_content,
                ContentType='image/svg+xml' if key.endswith('.svg') else 'image/png',
                CacheControl='public, max-age=31536000, immutable'
            )
        print(f"  [IMAGE OK] {word} -> {slug}.png / .jpg / .svg")
    except Exception as e:
        print(f"  [IMAGE ERROR] {word}: {e}")

print("Sync completed successfully!")
