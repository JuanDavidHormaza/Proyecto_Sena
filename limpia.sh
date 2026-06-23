docker compose down -v --remove-orphans
docker builder prune -a -f
docker system prune -a -f
