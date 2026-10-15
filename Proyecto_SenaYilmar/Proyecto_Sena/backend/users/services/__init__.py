# backend/users/services/__init__.py
from .storage_service import StorageService, StorageError, StorageUnavailableError, StorageFileNotFoundError
from .email_service import (
    send_otp_email,
    send_otp_email_async,
    send_transactional_email,
    send_plain_verification_email,
    build_institutional_email_html,
)

__all__ = [
    'StorageService',
    'StorageError',
    'StorageUnavailableError',
    'StorageFileNotFoundError',
    'send_otp_email',
    'send_otp_email_async',
    'send_transactional_email',
    'send_plain_verification_email',
    'build_institutional_email_html',
]
