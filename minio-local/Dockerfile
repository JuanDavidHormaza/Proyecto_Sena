# ==============================================================================
# WorkLex Local S3 Storage Service
# 100% reproducible, ligero (<50MB) y libre de enlaces externos o rate limits
# ==============================================================================
FROM python:3.11-alpine

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

COPY s3_server.py /app/s3_server.py

VOLUME ["/data"]

EXPOSE 9000 9001

HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=5s \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:9000/minio/health/live')" || exit 1

ENTRYPOINT ["python3", "/app/s3_server.py"]
