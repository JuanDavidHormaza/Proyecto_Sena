"""
EmailService - Servicio de despacho de correo para WorkLex SENA.

Resuelve el bloqueo de puertos SMTP (25, 465, 587) en proveedores VPS (DigitalOcean / Clouding):
1. Despacho asíncrono no bloqueante en hilo daemon para que los workers de Gunicorn respondan inmediatamente.
2. Soporte nativo para APIs HTTPS en puerto 443 (Resend y SendGrid) que nunca son bloqueadas.
3. Fallback tolerante con timeout estricto para evitar congelar la interfaz de usuario.
4. Generación de plantilla HTML institucional SENA con código OTP destacado y recomendaciones de seguridad.
"""

import logging
import os
import threading
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


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


def _send_via_resend(email: str, subject: str, plain_msg: str, html_msg: str, api_key: str) -> bool:
    """Envía correo vía API HTTPS de Resend (Puerto 443 - Bypasea bloqueo de DigitalOcean)."""
    try:
        import requests
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', '') or 'WorkLex SENA <onboarding@resend.dev>'
        if '<' not in from_email and '@' in from_email:
            from_email = f"WorkLex SENA <{from_email}>"

        resp = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key.strip()}",
                "Content-Type": "application/json"
            },
            json={
                "from": from_email,
                "to": [email],
                "subject": subject,
                "html": html_msg,
                "text": plain_msg,
            },
            timeout=5
        )
        if resp.status_code in (200, 201):
            logger.info(f"[RESEND API SUCCESS] Correo entregado exitosamente a {email} vía Resend HTTPS.")
            return True
        else:
            logger.warning(f"[RESEND API WARNING] Resend HTTP {resp.status_code}: {resp.text}")
            return False
    except Exception as err:
        logger.warning(f"[RESEND API ERROR] Error conectando con API de Resend: {err}")
        return False


def _send_via_sendgrid(email: str, subject: str, plain_msg: str, html_msg: str, api_key: str) -> bool:
    """Envía correo vía API HTTPS de SendGrid (Puerto 443 - Bypasea bloqueo de DigitalOcean)."""
    try:
        import requests
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@worklexsena.shop')
        resp = requests.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={
                "Authorization": f"Bearer {api_key.strip()}",
                "Content-Type": "application/json"
            },
            json={
                "personalizations": [{"to": [{"email": email}]}],
                "from": {"email": from_email, "name": "WorkLex SENA"},
                "subject": subject,
                "content": [
                    {"type": "text/plain", "value": plain_msg},
                    {"type": "text/html", "value": html_msg}
                ]
            },
            timeout=5
        )
        if resp.status_code in (200, 202):
            logger.info(f"[SENDGRID API SUCCESS] Correo entregado exitosamente a {email} vía SendGrid HTTPS.")
            return True
        else:
            logger.warning(f"[SENDGRID API WARNING] SendGrid HTTP {resp.status_code}: {resp.text}")
            return False
    except Exception as err:
        logger.warning(f"[SENDGRID API ERROR] Error conectando con API de SendGrid: {err}")
        return False


def _send_otp_task(email: str, code: str, subject: str, plain_msg: str, html_msg: str):
    """
    Tarea interna que se ejecuta en segundo plano para intentar envío
    por API HTTP (Resend/SendGrid) o SMTP con fallback tolerante.
    """
    # 1. Intentar proveedor HTTP si hay API Key configurada (Puerto 443 - Inmune a bloqueos)
    resend_key = getattr(settings, 'RESEND_API_KEY', '') or os.getenv('RESEND_API_KEY', '')
    if resend_key:
        if _send_via_resend(email, subject, plain_msg, html_msg, resend_key):
            return

    sendgrid_key = getattr(settings, 'SENDGRID_API_KEY', '') or os.getenv('SENDGRID_API_KEY', '')
    if sendgrid_key:
        if _send_via_sendgrid(email, subject, plain_msg, html_msg, sendgrid_key):
            return

    # 2. Intentar SMTP tradicional con timeout corto
    try:
        send_mail(
            subject=subject,
            message=plain_msg,
            html_message=html_msg,
            from_email=None,
            recipient_list=[email],
            fail_silently=False,
        )
        logger.info(f"[SMTP SUCCESS] Correo de verificación enviado exitosamente a {email}.")
    except Exception as e:
        logger.warning(f"[OTP EMAIL FAILOVER] No se pudo enviar por SMTP: {e}. Fallback activo para {email}: {code}")
        print(f"\n======================================================\n"
              f"[OTP EMAIL FAILOVER] Código generado para {email}: {code}\n"
              f"(Infraestructura VPS bloquea puertos SMTP 25/465/587. Código listo para verificación)\n"
              f"======================================================\n")


def send_otp_email_async(
    email: str,
    code: str,
    reason: str = "verificación de acceso",
    is_registration: bool = False
) -> None:
    """
    Despacha el correo de verificación OTP de manera ASÍNCRONA y NO BLOQUEANTE.
    Garantiza que la respuesta HTTP hacia el frontend se retorne en < 50ms sin colgar
    los workers de Gunicorn por timeout de puertos SMTP bloqueados.
    """
    # Impresión inmediata en consola para soporte/desarrollo
    print(f"[OTP DISPATCH] Código de 6 dígitos generado para {email}: {code} ({reason})")

    if is_registration:
        subject = f'Verifica tu correo ({code}) - WorkLex SENA'
        headline = "Verificación de Registro de Aprendiz"
        message = (
            "Bienvenido a <strong>WorkLex SENA</strong>. Para completar la creación de tu cuenta institucional "
            "y confirmar tu identidad, ingresa el siguiente código de 6 dígitos:"
        )
    else:
        subject = f'Tu código de verificación ({code}) - WorkLex SENA'
        headline = "Código de Verificación de Seguridad"
        message = (
            f"Has solicitado un código de verificación para <strong>{reason}</strong> en la plataforma "
            f"WorkLex SENA. Utiliza el siguiente código para continuar:"
        )

    plain_msg = (
        f"WorkLex SENA - Verificación de Seguridad\n\n"
        f"Tu código de verificación para {reason} es: {code}\n\n"
        f"Este código expira en 10 minutos.\n\n"
        f"Si no solicitaste este código, ignora este mensaje."
    )

    html_msg = build_institutional_email_html(
        title=subject,
        headline=headline,
        message=message,
        otp_code=code,
    )

    # Iniciar envío en hilo daemon desacoplado (cero latencia para la petición web)
    t = threading.Thread(
        target=_send_otp_task,
        args=(email, code, subject, plain_msg, html_msg),
        daemon=True
    )
    t.start()
