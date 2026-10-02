import logging
from django.apps import AppConfig

logger = logging.getLogger(__name__)


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'users'

    def ready(self):
        try:
            from .services.storage_service import StorageService
            StorageService.ensure_all_buckets()
        except Exception as e:
            logger.warning(f"StorageService buckets deferred initialization: {e}")
