# backend/services/email_service.py
"""
Servicio centralizado de despacho de correo para WorkLex SENA vía Resend HTTPS API (Puerto 443).
Bypasses blocked SMTP ports (465/587) in VPS hosting environments.
"""
from users.services.email_service import (
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
