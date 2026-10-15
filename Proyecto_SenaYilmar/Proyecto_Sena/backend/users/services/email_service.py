"""
EmailService - Servicio de despacho de correo para WorkLex SENA vía Resend HTTPS API (Puerto 443).

MIGRACIÓN TOTAL DE ENVÍO DE OTP A RESEND API (HTTPS):
Resuelve el bloqueo de puertos SMTP tradicionales (25, 465, 587) impuesto por políticas de red del VPS (DigitalOcean / Clouding):
1. Despacho directo vía API REST HTTPS (https://api.resend.com/emails) sobre puerto 443 estándar.
2. Cero dependencia de sockets SMTP directos para prevenir fallos o cuelgues por timeout en workers de Gunicorn.
3. Soporte para variables oficiales RESEND_API_KEY y RESEND_FROM_EMAIL (con fallback seguro a onboarding@resend.dev).
4. Tolerancia total ante fallos de red con logging detallado y fallback en consola para desarrollo y soporte.
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


def send_otp_email(recipient_email: str, otp_code: str) -> bool:
    """
    Envía el código de verificación OTP mediante la API REST HTTPS de Resend (puerto 443).
    Bypasses blocked SMTP ports (465/587) on VPS servers.

    Args:
        recipient_email (str): Correo destinatario.
        otp_code (str): Código numérico de verificación de 6 dígitos.

    Returns:
        bool: True si el correo fue despachado exitosamente por Resend, False en caso contrario.
    """
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key and settings is not None:
        api_key = getattr(settings, "RESEND_API_KEY", None)

    from_email = (
        os.getenv("RESEND_FROM_EMAIL", "").strip() or
        getattr(settings, "RESEND_FROM_EMAIL", "").strip() or
        "onboarding@resend.dev"
    )

    if not api_key:
        logger.error("RESEND_API_KEY no configurada. Imprimiendo OTP en logs: %s", otp_code)
        print(f"\n======================================================================\n"
              f" [WORKLEX SENA - OTP CONSOLE FALLBACK]\n"
              f" Destinatario : {recipient_email}\n"
              f" Código OTP    : {otp_code}\n"
              f" Motivo        : RESEND_API_KEY no configurada en variables de entorno\n"
              f" Solución      : Configura RESEND_API_KEY=re_... en tu archivo .env\n"
              f"======================================================================\n")
        return False

    api_key = api_key.strip()

    payload = {
        "from": from_email,
        "to": [recipient_email],
        "subject": "Código de Verificación - WorkLex SENA",
        "html": f"""
        <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; rounded: 8px;">
            <h2 style="color: #39A900; margin-bottom: 8px;">WorkLex SENA</h2>
            <p style="font-size: 15px; color: #334155;">Usa el siguiente código de verificación para continuar:</p>
            <div style="background-color: #f1f5f9; padding: 14px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #0f172a; margin: 20px 0;">
                {otp_code}
            </div>
            <p style="font-size: 12px; color: #64748b;">Este código es válido por 10 minutos. Si no lo solicitaste, puedes ignorar este mensaje.</p>
        </div>
        """,
        "text": f"WorkLex SENA\n\nTu código de verificación es: {otp_code}\n\nEste código es válido por 10 minutos. Si no lo solicitaste, puedes ignorar este mensaje."
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post("https://api.resend.com/emails", json=payload, headers=headers, timeout=10)
        if response.status_code in (200, 201):
            logger.info("Correo OTP enviado exitosamente a %s vía Resend", recipient_email)
            return True
        else:
            logger.error("Error al enviar con Resend (%s): %s", response.status_code, response.text)
            print(f"[WORKLEX SENA OTP FALLBACK] Código OTP para {recipient_email}: {otp_code}")
            return False
    except Exception as exc:
        logger.exception("Excepción conectando a la API de Resend: %s", exc)
        print(f"[WORKLEX SENA OTP FALLBACK] Código OTP para {recipient_email}: {otp_code}")
        return False


def send_transactional_email(
    recipient_email: str,
    subject: str,
    message: str,
    html_message: str = None
) -> bool:
    """
    Envía un correo transaccional general vía API HTTPS de Resend (puerto 443).
    Sustituye completamente send_mail de Django para evitar dependencias de puertos SMTP bloqueados.

    Args:
        recipient_email (str | list[str]): Correo o lista de correos destinatarios.
        subject (str): Asunto del correo.
        message (str): Mensaje en texto plano.
        html_message (str, optional): Mensaje con formato HTML.

    Returns:
        bool: True si el correo fue aceptado por Resend, False en caso contrario.
    """
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key and settings is not None:
        api_key = getattr(settings, "RESEND_API_KEY", None)

    from_email = (
        os.getenv("RESEND_FROM_EMAIL", "").strip() or
        getattr(settings, "RESEND_FROM_EMAIL", "").strip() or
        "onboarding@resend.dev"
    )

    if not api_key:
        logger.warning("RESEND_API_KEY no configurada. Omitiendo despacho transaccional a %s", recipient_email)
        return False

    api_key = api_key.strip()
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
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post("https://api.resend.com/emails", json=payload, headers=headers, timeout=10)
        if response.status_code in (200, 201):
            logger.info("Correo transaccional enviado exitosamente a %s vía Resend", recipients)
            return True
        else:
            logger.error("Error al enviar correo transaccional con Resend (%s): %s", response.status_code, response.text)
            return False
    except Exception as exc:
        logger.exception("Excepción conectando a la API de Resend para correo transaccional: %s", exc)
        return False


def send_otp_email_async(
    email: str,
    code: str,
    reason: str = "verificación de acceso",
    is_registration: bool = False,
    first_name: str = "Usuario"
) -> None:
    """
    Despacha el correo de verificación OTP de manera ASÍNCRONA y NO BLOQUEANTE vía Resend HTTPS (puerto 443).
    Garantiza que la respuesta HTTP hacia el frontend se retorne en < 50ms sin colgar
    los workers de Gunicorn por bloqueos en la red.
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
    Envío de verificación en texto plano mediante Resend HTTPS API (puerto 443).
    """
    return send_otp_email(recipient_email=user_email, otp_code=codigo_verificacion)


def _send_otp_task(email: str, code: str, subject: str, plain_msg: str, html_msg: str, reason: str = ""):
    """
    Alias de compatibilidad interna que despacha el OTP mediante Resend HTTPS API (puerto 443).
    """
    send_otp_email(recipient_email=email, otp_code=code)


def _send_via_resend(email: str, subject: str, plain_msg: str, html_msg: str, api_key: str) -> bool:
    """
    Alias de compatibilidad para envío directo vía Resend HTTPS API.
    """
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
