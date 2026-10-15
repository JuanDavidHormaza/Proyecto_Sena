# backend/services/__init__.py
from .email_service import (
    send_otp_email,
    send_otp_email_async,
    send_transactional_email,
    send_plain_verification_email,
    build_institutional_email_html,
)

__all__ = [
    "send_otp_email",
    "send_otp_email_async",
    "send_transactional_email",
    "send_plain_verification_email",
    "build_institutional_email_html",
]
