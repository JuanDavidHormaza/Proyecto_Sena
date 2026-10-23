"""
EmailService - Servicio de despacho de correo para WorkLex SENA.

Soporta múltiples canales de entrega configurables:
1. SMTP real de Gmail con contraseña de aplicación (App Password) - Entrega directa a cualquier buzón.
2. Resend API REST HTTPS (Puerto 443)
3. Brevo API REST HTTPS (Puerto 443)
4. SendGrid API REST HTTPS (Puerto 443)
5. Fallback seguro en consola / logs para entornos locales o de desarrollo sin credenciales.
"""

import os
import requests
import logging
import threading
from django.conf import settings

logger = logging.getLogger(__name__)

# Intentar importar el SDK oficial de Resend si está disponible en el entorno
try:
    import resend
    RESEND_SDK_AVAILABLE = True
except ImportError:
    RESEND_SDK_AVAILABLE = False


def send_otp_email_detailed(recipient_email: str, otp_code: str) -> tuple[bool, str]:
    """
    Envía el código de verificación OTP evaluando los proveedores configurados:
    1. Django EmailBackend (SMTP Gmail con App Password) - entrega directa sin restricciones de dominio.
    2. Resend API (HTTPS Puerto 443)
    3. Brevo API (HTTPS Puerto 443)
    4. SendGrid API (HTTPS Puerto 443)
    5. Django EmailBackend genérico (si no es Dummy)

    Returns:
        tuple[bool, str]: (éxito, mensaje_o_motivo_técnico)
    """
    errors = []

    subject = "Código de Verificación - WorkLex SENA"
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #39A900; margin-bottom: 8px;">WorkLex SENA</h2>
        <p style="font-size: 15px; color: #334155;">Usa el siguiente código de verificación para continuar:</p>
        <div style="background-color: #f1f5f9; padding: 14px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #0f172a; margin: 20px 0;">
            {otp_code}
        </div>
        <p style="font-size: 12px; color: #64748b;">Este código es válido por 10 minutos. Si no lo solicitaste, puedes ignorar este mensaje.</p>
    </div>
    """
    text_content = (
        f"WorkLex SENA\n\n"
        f"Tu código de verificación es: {otp_code}\n\n"
        f"Este código es válido por 10 minutos. Si no lo solicitaste, puedes ignorar este mensaje."
    )

    # ── 1. Django EmailBackend (SMTP Gmail con App Password) ───────────────────
    # Canal preferido para entrega directa y universal sin restricciones de prueba
    email_backend = getattr(settings, "EMAIL_BACKEND", "") if settings else ""
    is_dummy_backend = "dummy" in str(email_backend).lower()
    host_user = getattr(settings, "EMAIL_HOST_USER", "") if settings else ""
    host_password = getattr(settings, "EMAIL_HOST_PASSWORD", "") if settings else ""

    if not is_dummy_backend and host_user and host_password:
        try:
            from django.core.mail import send_mail
            from_addr = getattr(settings, "DEFAULT_FROM_EMAIL", f"WorkLex SENA <{host_user}>")
            send_mail(
                subject=subject,
                message=text_content,
                from_email=from_addr,
                recipient_list=[recipient_email],
                html_message=html_content,
                fail_silently=False,
            )
            logger.info("Correo OTP entregado vía SMTP Gmail para %s", recipient_email)
            return True, "Enviado exitosamente vía SMTP Gmail"
        except Exception as exc:
            err_msg = f"Fallo al despachar vía SMTP Gmail: {exc}"
            logger.warning("[EmailService] %s", err_msg)
            errors.append(err_msg)

    # ── 2. Resend API (HTTPS Puerto 443) ──────────────────────────────────────
    resend_key = os.getenv("RESEND_API_KEY") or (getattr(settings, "RESEND_API_KEY", None) if settings else None)
    if resend_key and resend_key.strip():
        from_email = (
            os.getenv("RESEND_FROM_EMAIL", "").strip() or
            (getattr(settings, "RESEND_FROM_EMAIL", "").strip() if settings else "") or
            "onboarding@resend.dev"
        )
        payload = {
            "from": from_email,
            "to": [recipient_email],
            "subject": subject,
            "html": html_content,
            "text": text_content,
        }
        headers = {
            "Authorization": f"Bearer {resend_key.strip()}",
            "Content-Type": "application/json",
        }
        try:
            resp = requests.post("https://api.resend.com/emails", json=payload, headers=headers, timeout=8)
            if resp.status_code in (200, 201):
                logger.info("Correo OTP entregado a Resend para %s", recipient_email)
                return True, "Enviado exitosamente vía Resend API"
            else:
                err_msg = f"Resend HTTP {resp.status_code}: {resp.text}"
                logger.warning("[EmailService] %s", err_msg)
                errors.append(err_msg)
        except Exception as exc:
            err_msg = f"Excepción de conexión con Resend: {exc}"
            logger.warning("[EmailService] %s", err_msg)
            errors.append(err_msg)

    # ── 3. Brevo API (HTTPS Puerto 443) ───────────────────────────────────────
    brevo_key = os.getenv("BREVO_API_KEY") or (getattr(settings, "BREVO_API_KEY", None) if settings else None)
    if brevo_key and brevo_key.strip():
        sender_email = (
            os.getenv("BREVO_SENDER_EMAIL", "").strip() or
            (getattr(settings, "BREVO_SENDER_EMAIL", "").strip() if settings else "") or
            "sworklex@gmail.com"
        )
        payload = {
            "sender": {"name": "WorkLex SENA", "email": sender_email},
            "to": [{"email": recipient_email}],
            "subject": subject,
            "htmlContent": html_content,
            "textContent": text_content,
        }
        headers = {
            "api-key": brevo_key.strip(),
            "Content-Type": "application/json",
        }
        try:
            resp = requests.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers, timeout=8)
            if resp.status_code in (200, 201):
                logger.info("Correo OTP entregado a Brevo para %s", recipient_email)
                return True, "Enviado exitosamente vía Brevo API"
            else:
                err_msg = f"Brevo HTTP {resp.status_code}: {resp.text}"
                logger.warning("[EmailService] %s", err_msg)
                errors.append(err_msg)
        except Exception as exc:
            err_msg = f"Excepción de conexión con Brevo: {exc}"
            logger.warning("[EmailService] %s", err_msg)
            errors.append(err_msg)

    # ── 4. SendGrid API (HTTPS Puerto 443) ────────────────────────────────────
    sendgrid_key = os.getenv("SENDGRID_API_KEY") or (getattr(settings, "SENDGRID_API_KEY", None) if settings else None)
    if sendgrid_key and sendgrid_key.strip():
        from_email = (
            os.getenv("SENDGRID_FROM_EMAIL", "").strip() or
            (getattr(settings, "SENDGRID_FROM_EMAIL", "").strip() if settings else "") or
            "no-reply@worklexsena.shop"
        )
        payload = {
            "personalizations": [{"to": [{"email": recipient_email}]}],
            "from": {"email": from_email, "name": "WorkLex SENA"},
            "subject": subject,
            "content": [{"type": "text/html", "value": html_content}],
        }
        headers = {
            "Authorization": f"Bearer {sendgrid_key.strip()}",
            "Content-Type": "application/json",
        }
        try:
            resp = requests.post("https://api.sendgrid.com/v3/mail/send", json=payload, headers=headers, timeout=8)
            if resp.status_code in (200, 202):
                logger.info("Correo OTP entregado a SendGrid para %s", recipient_email)
                return True, "Enviado exitosamente vía SendGrid API"
            else:
                err_msg = f"SendGrid HTTP {resp.status_code}: {resp.text}"
                logger.warning("[EmailService] %s", err_msg)
                errors.append(err_msg)
        except Exception as exc:
            err_msg = f"Excepción de conexión con SendGrid: {exc}"
            logger.warning("[EmailService] %s", err_msg)
            errors.append(err_msg)

    # ── 5. Django Mail Backend de prueba (ej. locmem o smtp sin contraseña) ───
    if not is_dummy_backend and host_user and not host_password:
        try:
            from django.core.mail import send_mail
            from_addr = getattr(settings, "DEFAULT_FROM_EMAIL", f"WorkLex SENA <{host_user}>")
            send_mail(
                subject=subject,
                message=text_content,
                from_email=from_addr,
                recipient_list=[recipient_email],
                html_message=html_content,
                fail_silently=False,
            )
            logger.info("Correo OTP entregado vía Django EmailBackend para %s", recipient_email)
            return True, "Enviado exitosamente vía Django EmailBackend"
        except Exception as exc:
            err_msg = f"Fallo al despachar vía Django EmailBackend: {exc}"
            logger.warning("[EmailService] %s", err_msg)
            errors.append(err_msg)

    # ── Ningún proveedor configurado o todos fallaron ─────────────────────────
    diag_summary = "; ".join(errors) if errors else "Ningún proveedor de correo (SMTP Gmail, Resend, Brevo ni SendGrid) tiene credenciales activas."
    logger.error("[EmailService] Despacho de OTP fallido para %s: %s", recipient_email, diag_summary)

    dev_allowed = (getattr(settings, "DEBUG", False) or getattr(settings, "DEV_RETURN_OTP", False)) if settings else True
    if dev_allowed:
        print(
            f"\n======================================================================\n"
            f" [WORKLEX SENA - OTP CONSOLE FALLBACK]\n"
            f" Destinatario : {recipient_email}\n"
            f" Código OTP    : {otp_code}\n"
            f" Diagnóstico   : {diag_summary}\n"
            f" Solución      : Configura EMAIL_HOST_PASSWORD o RESEND_API_KEY en .env\n"
            f"======================================================================\n"
        )

    return False, diag_summary


def send_otp_email(recipient_email: str, otp_code: str) -> bool:
    """
    Envía el código de verificación OTP mediante el proveedor configurado.
    Wrapper compatible que devuelve True/False.
    """
    success, _ = send_otp_email_detailed(recipient_email, otp_code)
    return success


def send_transactional_email(
    recipient_email: str,
    subject: str,
    message: str,
    html_message: str = None
) -> bool:
    """
    Envía un correo transaccional general vía SMTP Gmail o API HTTPS configurada.
    """
    host_user = getattr(settings, "EMAIL_HOST_USER", "") if settings else ""
    host_password = getattr(settings, "EMAIL_HOST_PASSWORD", "") if settings else ""

    if host_user and host_password:
        try:
            from django.core.mail import send_mail
            recipients = [recipient_email] if isinstance(recipient_email, str) else list(recipient_email)
            from_addr = getattr(settings, "DEFAULT_FROM_EMAIL", f"WorkLex SENA <{host_user}>")
            send_mail(
                subject=subject,
                message=message,
                from_email=from_addr,
                recipient_list=recipients,
                html_message=html_message,
                fail_silently=False,
            )
            return True
        except Exception as exc:
            logger.warning("[EmailService] Fallo transaccional vía SMTP: %s", exc)

    resend_key = os.getenv("RESEND_API_KEY") or (getattr(settings, "RESEND_API_KEY", None) if settings else None)
    if resend_key and resend_key.strip():
        from_email = (
            os.getenv("RESEND_FROM_EMAIL", "").strip() or
            (getattr(settings, "RESEND_FROM_EMAIL", "").strip() if settings else "") or
            "onboarding@resend.dev"
        )
        recipients = [recipient_email] if isinstance(recipient_email, str) else list(recipient_email)
        payload = {
            "from": from_email,
            "to": recipients,
            "subject": subject,
            "text": message,
        }
        if html_message:
            payload["html"] = html_message
        headers = {
            "Authorization": f"Bearer {resend_key.strip()}",
            "Content-Type": "application/json"
        }
        try:
            resp = requests.post("https://api.resend.com/emails", json=payload, headers=headers, timeout=10)
            return resp.status_code in (200, 201)
        except Exception:
            return False

    return False


def send_otp_email_async(
    email: str,
    code: str,
    reason: str = "verificación de acceso",
    is_registration: bool = False,
    first_name: str = "Usuario"
) -> None:
    """
    Despacha el correo de verificación OTP de manera ASÍNCRONA y NO BLOQUEANTE.
    """
    t = threading.Thread(
        target=send_otp_email,
        args=(email, code),
        daemon=True
    )
    t.start()


def send_plain_verification_email(
    user_email: str,
    codigo_verificacion: str,
    first_name: str = "Usuario"
) -> bool:
    """
    Envío de verificación en texto plano mediante el servicio de correo activo.
    """
    return send_otp_email(recipient_email=user_email, otp_code=codigo_verificacion)


def _send_otp_task(email: str, code: str, subject: str, plain_msg: str, html_msg: str, reason: str = ""):
    send_otp_email(recipient_email=email, otp_code=code)


def _send_via_resend(email: str, subject: str, plain_msg: str, html_msg: str, api_key: str) -> bool:
    return send_transactional_email(
        recipient_email=email,
        subject=subject,
        message=plain_msg,
        html_message=html_msg if html_msg != plain_msg else None
    )


def build_institutional_email_html(
    title: str,
    headline: str,
    message: str,
    otp_code: str = None,
    warning: str = None
) -> str:
    """
    Construye una plantilla de correo electrónico HTML institucional SENA / WorkLex
    con paleta oficial (Verde #39A900, Azul Marino #00324D) y diseño responsive.
    """
    otp_block = ""
    if otp_code:
        otp_block = f"""
        <div style="margin: 28px 0; text-align: center;">
          <div style="display: inline-block; background-color: #f0fdf4; border: 2px dashed #39A900; border-radius: 12px; padding: 18px 32px;">
            <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #15803d; letter-spacing: 1.5px;">Código de Verificación Seguro</p>
            <p style="margin: 0; font-family: 'Courier New', Courier, monospace, sans-serif; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #00324D;">{otp_code}</p>
          </div>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">Válido únicamente durante los próximos <strong>10 minutos</strong>.</p>
        </div>
        """

    warning_block = ""
    if warning:
        warning_block = f"""
        <div style="margin-top: 20px; padding: 12px 16px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; font-size: 12px; color: #92400e; line-height: 1.5;">
          <strong>Nota de seguridad:</strong> {warning}
        </div>
        """
    else:
        warning_block = """
        <div style="margin-top: 20px; padding: 12px 16px; background-color: #f8fafc; border-left: 4px solid #94a3b8; border-radius: 6px; font-size: 12px; color: #475569; line-height: 1.5;">
          <strong>Seguridad:</strong> Nunca compartas este código con terceros ni con personal no autorizado. El equipo de soporte SENA jamás te solicitará tu código por teléfono ni redes sociales.
        </div>
        """

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          <!-- Encabezado Institucional -->
          <tr>
            <td style="background-color: #00324D; padding: 24px 30px; text-align: left; border-bottom: 4px solid #39A900;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left">
                    <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">Work<span style="color: #39A900;">Lex</span> <span style="font-size: 13px; font-weight: 600; color: #93c5fd; background: rgba(255,255,255,0.12); padding: 3px 8px; border-radius: 6px; margin-left: 6px;">SENA</span></span>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-weight: 700; color: #e2e8f0; text-transform: uppercase; letter-spacing: 1px;">Dirección de Formación</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Contenido Principal -->
          <tr>
            <td style="padding: 32px 30px 24px 30px;">
              <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #00324D; line-height: 1.3;">{headline}</h1>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">{message}</p>
              {otp_block}
              {warning_block}
            </td>
          </tr>
          <!-- Pie de Página Institucional -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #64748b;">Servicio Nacional de Aprendizaje SENA — Colombia</p>
              <p style="margin: 0 0 8px 0; font-size: 11px; color: #94a3b8;">Plataforma Institucional de Bilingüismo y Evaluación Lingüística Adaptativa</p>
              <p style="margin: 0; font-size: 10px; color: #cbd5e1;">Este es un mensaje generado automáticamente por el sistema de seguridad WorkLex SENA. Por favor, no respondas a este correo.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
