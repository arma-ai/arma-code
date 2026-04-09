"""Email service for sending verification codes and notifications."""

import logging
import smtplib
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta

from app.core.config import settings

logger = logging.getLogger(__name__)


def generate_verification_code() -> str:
    """Generate a 6-digit verification code."""
    return f"{random.randint(100000, 999999)}"


def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """
    Send an email via SMTP.
    Returns True if sent successfully, False otherwise.
    In debug mode, prints to console instead.
    """
    if settings.EMAIL_DEBUG_MODE:
        logger.info(f"[EMAIL DEBUG] To: {to_email} | Subject: {subject}")
        logger.info(f"[EMAIL DEBUG] Body:\n{html_content}")
        print(f"\n{'='*60}")
        print(f"[EMAIL] To: {to_email}")
        print(f"[EMAIL] Subject: {subject}")
        print(f"[EMAIL] Body:\n{html_content}")
        print(f"{'='*60}\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_content, "html"))

        if settings.SMTP_USE_TLS:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            server.starttls()
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)

        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

        server.sendmail(settings.SMTP_FROM_EMAIL, to_email, msg.as_string())
        server.quit()
        logger.info(f"Email sent to {to_email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def send_verification_code(email: str, code: str) -> bool:
    """Send a verification code email."""
    subject = "Verify your email — Arma AI"
    html_content = f"""
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0C0C0F; color: #F3F3F3; padding: 40px;">
        <div style="max-width: 480px; margin: 0 auto; background: #1A1A1E; border-radius: 16px; padding: 32px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #FF8A3D; font-size: 24px; margin: 0;">Arma AI</h1>
            </div>
            <h2 style="color: #F3F3F3; font-size: 20px; margin: 0 0 16px 0;">Verify your email</h2>
            <p style="color: #9CA3AF; font-size: 14px; line-height: 1.6;">
                Use the code below to verify your email address. This code expires in 10 minutes.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <div style="display: inline-block; background: rgba(255,138,61,0.1); border: 1px solid rgba(255,138,61,0.3); border-radius: 12px; padding: 16px 32px;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #FF8A3D;">{code}</span>
                </div>
            </div>
            <p style="color: #6B7280; font-size: 12px; text-align: center;">
                If you didn't request this, you can safely ignore this email.
            </p>
        </div>
    </body>
    </html>
    """
    return send_email(email, subject, html_content)
