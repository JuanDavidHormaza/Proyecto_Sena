#!/usr/bin/env python3
"""
WorkLex S3 Local Storage Server
Servicio de almacenamiento compatible con S3 / MinIO para entornos de desarrollo y producción local.
- Cero dependencias de binarios externos o enlaces rotos (dl.min.io / Docker Hub rate limits).
- Compatible con boto3 (SigV4, path-style) y Nginx proxy.
- Auto-inicialización de buckets y sincronización de semillas multimedia.
"""
import os
import sys
import shutil
import mimetypes
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
import xml.etree.ElementTree as ET

DATA_DIR = os.getenv("MINIO_DATA_DIR", "/data")
PORT = int(os.getenv("MINIO_PORT", 9000))
CONSOLE_PORT = int(os.getenv("MINIO_CONSOLE_PORT", 9001))
SEED_DIR = os.getenv("MINIO_SEED_DIR", "/seed")

REQUIRED_BUCKETS = [
    "dictionary-audios",
    "dictionary-images",
    "dictionary-videos",
    "exam-audios",
    "exam-submissions"
]


def init_storage():
    """Crea los buckets necesarios y copia semillas si existen."""
    os.makedirs(DATA_DIR, exist_ok=True)
    print(f"[WorkLex S3] Inicializando almacenamiento en: {DATA_DIR}")

    for b in REQUIRED_BUCKETS:
        b_dir = os.path.join(DATA_DIR, b)
        os.makedirs(b_dir, exist_ok=True)

    # Sincronización automática de semillas
    if os.path.isdir(SEED_DIR):
        print(f"[WorkLex S3] Verificando semillas en: {SEED_DIR}")
        for b in REQUIRED_BUCKETS:
            src = os.path.join(SEED_DIR, b)
            dst = os.path.join(DATA_DIR, b)
            if os.path.isdir(src):
                files = os.listdir(src)
                if files:
                    for item in files:
                        s = os.path.join(src, item)
                        d = os.path.join(dst, item)
                        if not os.path.exists(d):
                            if os.path.isdir(s):
                                shutil.copytree(s, d)
                            else:
                                shutil.copy2(s, d)
                    print(f"  + Semillas sincronizadas para bucket: '{b}' ({len(files)} elementos)")


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


class S3Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, format, *args):
        # Log simplificado
        sys.stdout.write(f"[S3] {self.command} {self.path} - {args[1]}\n")
        sys.stdout.flush()

    def _send_xml(self, xml_str, status=200):
        data = xml_str.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/xml')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Connection', 'keep-alive')
        self.end_headers()
        self.wfile.write(data)

    def _send_error(self, code, message, status=404):
        xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Error>
    <Code>{code}</Code>
    <Message>{message}</Message>
    <Resource>{self.path}</Resource>
</Error>"""
        self._send_xml(xml, status=status)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, HEAD, PUT, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.lstrip('/')
        query = urllib.parse.parse_qs(parsed.query)

        # Healthcheck nativo
        if path.startswith('minio/health') or path in ('health', 'healthz', 'ping'):
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.send_header('Content-Length', '2')
            self.end_headers()
            self.wfile.write(b'OK')
            return

        # List all buckets (GET /)
        if not path:
            buckets = [d for d in os.listdir(DATA_DIR) if os.path.isdir(os.path.join(DATA_DIR, d))]
            items = "".join(f"<Bucket><Name>{b}</Name><CreationDate>2026-01-01T00:00:00.000Z</CreationDate></Bucket>" for b in buckets)
            xml = f'<?xml version="1.0" encoding="UTF-8"?><ListAllMyBucketsResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Buckets>{items}</Buckets></ListAllMyBucketsResult>'
            self._send_xml(xml)
            return

        parts = path.split('/', 1)
        bucket = parts[0]
        bucket_path = os.path.join(DATA_DIR, bucket)

        # List objects in bucket (GET /<bucket> or GET /<bucket>?list-type=2)
        if len(parts) == 1 or parts[1] == '':
            if not os.path.isdir(bucket_path):
                self._send_error('NoSuchBucket', 'The specified bucket does not exist.', status=404)
                return

            prefix = query.get('prefix', [''])[0]
            files = []
            for root, _, filenames in os.walk(bucket_path):
                for f in filenames:
                    full = os.path.join(root, f)
                    rel = os.path.relpath(full, bucket_path).replace('\\', '/')
                    if not prefix or rel.startswith(prefix):
                        stat = os.stat(full)
                        files.append((rel, stat.st_size, stat.st_mtime))

            contents_xml = "".join(
                f"<Contents><Key>{k}</Key><LastModified>2026-01-01T00:00:00.000Z</LastModified><Size>{sz}</Size><ETag>&quot;etag-{k}&quot;</ETag><StorageClass>STANDARD</StorageClass></Contents>"
                for k, sz, _ in files
            )
            xml = f'<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>{bucket}</Name><Prefix>{prefix}</Prefix><KeyCount>{len(files)}</KeyCount><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated>{contents_xml}</ListBucketResult>'
            self._send_xml(xml)
            return

        # Get object (GET /<bucket>/<key>)
        key = urllib.parse.unquote(parts[1])
        file_path = os.path.join(bucket_path, key)

        if not os.path.isfile(file_path):
            # Fallback búsqueda tolerante a mayúsculas/minúsculas
            found = False
            if os.path.isdir(bucket_path):
                target_lower = os.path.basename(key).lower()
                for f in os.listdir(bucket_path):
                    if f.lower() == target_lower:
                        file_path = os.path.join(bucket_path, f)
                        found = True
                        break
            if not found:
                self._send_error('NoSuchKey', 'The specified key does not exist.', status=404)
                return

        stat = os.stat(file_path)
        total_size = stat.st_size
        content_type, _ = mimetypes.guess_type(file_path)
        content_type = content_type or 'application/octet-stream'

        # Soporte para cabecera HTTP Range (streaming audio/video)
        range_header = self.headers.get('Range')
        if range_header and range_header.startswith('bytes='):
            try:
                ranges = range_header.replace('bytes=', '').split('-')
                start = int(ranges[0]) if ranges[0] else 0
                end = int(ranges[1]) if ranges[1] else total_size - 1
                end = min(end, total_size - 1)
                length = end - start + 1

                self.send_response(206)
                self.send_header('Content-Type', content_type)
                self.send_header('Content-Range', f'bytes {start}-{end}/{total_size}')
                self.send_header('Content-Length', str(length))
                self.send_header('Accept-Ranges', 'bytes')
                self.send_header('ETag', f'"s3-{stat.st_mtime}"')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()

                with open(file_path, 'rb') as f:
                    f.seek(start)
                    self.wfile.write(f.read(length))
                return
            except Exception as e:
                pass

        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(total_size))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('ETag', f'"s3-{stat.st_mtime}"')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        with open(file_path, 'rb') as f:
            shutil.copyfileobj(f, self.wfile)

    def do_HEAD(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.lstrip('/')

        if path.startswith('minio/health') or path in ('health', 'healthz'):
            self.send_response(200)
            self.send_header('Content-Length', '2')
            self.end_headers()
            return

        parts = path.split('/', 1)
        bucket = parts[0]
        bucket_path = os.path.join(DATA_DIR, bucket)

        # Head bucket (HEAD /<bucket>)
        if len(parts) == 1 or parts[1] == '':
            if os.path.isdir(bucket_path):
                self.send_response(200)
            else:
                self.send_response(404)
            self.send_header('Content-Length', '0')
            self.end_headers()
            return

        # Head object (HEAD /<bucket>/<key>)
        key = urllib.parse.unquote(parts[1])
        file_path = os.path.join(bucket_path, key)

        if not os.path.isfile(file_path):
            found = False
            if os.path.isdir(bucket_path):
                target_lower = os.path.basename(key).lower()
                for f in os.listdir(bucket_path):
                    if f.lower() == target_lower:
                        file_path = os.path.join(bucket_path, f)
                        found = True
                        break
            if not found:
                self.send_response(404)
                self.end_headers()
                return

        stat = os.stat(file_path)
        content_type, _ = mimetypes.guess_type(file_path)
        content_type = content_type or 'application/octet-stream'

        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(stat.st_size))
        self.send_header('ETag', f'"s3-{stat.st_mtime}"')
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.lstrip('/')
        parts = path.split('/', 1)
        bucket = parts[0]
        bucket_path = os.path.join(DATA_DIR, bucket)

        # Create bucket (PUT /<bucket>)
        if len(parts) == 1 or parts[1] == '':
            os.makedirs(bucket_path, exist_ok=True)
            self.send_response(200)
            self.send_header('Location', f'/{bucket}')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return

        # Put object (PUT /<bucket>/<key>)
        key = urllib.parse.unquote(parts[1])
        file_path = os.path.join(bucket_path, key)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        length = int(self.headers.get('Content-Length', 0))
        remaining = length
        chunk_size = 64 * 1024

        with open(file_path, 'wb') as f:
            while remaining > 0:
                to_read = min(remaining, chunk_size)
                chunk = self.rfile.read(to_read)
                if not chunk:
                    break
                f.write(chunk)
                remaining -= len(chunk)

        self.send_response(200)
        self.send_header('ETag', f'"s3-{os.path.getmtime(file_path)}"')
        self.send_header('Content-Length', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.lstrip('/')
        parts = path.split('/', 1)
        bucket = parts[0]
        bucket_path = os.path.join(DATA_DIR, bucket)

        if len(parts) == 1 or parts[1] == '':
            if os.path.isdir(bucket_path):
                shutil.rmtree(bucket_path, ignore_errors=True)
            self.send_response(204)
            self.send_header('Content-Length', '0')
            self.end_headers()
            return

        key = urllib.parse.unquote(parts[1])
        file_path = os.path.join(bucket_path, key)
        if os.path.isfile(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass

        self.send_response(204)
        self.send_header('Content-Length', '0')
        self.end_headers()


def run():
    init_storage()
    server_address = ('0.0.0.0', PORT)
    httpd = ThreadedHTTPServer(server_address, S3Handler)
    print(f"[WorkLex S3] Servidor activo escuchando en http://0.0.0.0:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[WorkLex S3] Deteniendo servidor...")
        httpd.server_close()


if __name__ == '__main__':
    run()
