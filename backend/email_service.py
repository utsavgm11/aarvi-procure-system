# email_service.py
import smtplib
import os
import logging
import socket
from datetime import date
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger("AarviProcure")

# -------------------------------------------------------------------
# 🎯 FORCE IPv4 RESOLUTION (Fixes Render/Cloud "[Errno 101] Network is unreachable")
# -------------------------------------------------------------------
def force_ipv4():
    old_getaddrinfo = socket.getaddrinfo
    def new_getaddrinfo(*args, **kwargs):
        responses = old_getaddrinfo(*args, **kwargs)
        return [r for r in responses if r[0] == socket.AF_INET]
    socket.getaddrinfo = new_getaddrinfo

force_ipv4()

# -------------------------------------------------------------------
# SMTP CONFIGURATION (GMAIL SETUP)
# -------------------------------------------------------------------
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "aarvi.procure.test@gmail.com")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD", "fpxc mhbg qtar uadf")

# -------------------------------------------------------------------
# 🛡️ DAILY EMAIL SAFETY CAP ENGINE (Protects domain from exceeding limits)
# -------------------------------------------------------------------
DAILY_LIMIT = 400  # Strict daily cap buffer
email_counter = 0
last_reset_date = date.today()

def send_workflow_email(
    recipient_email: str, 
    recipient_name: str, 
    subject: str, 
    ticket_number: str, 
    project_name: str, 
    status: str, 
    action_link: str = "https://procure.aarviencon.com"
):
    """
    Synchronous SMTP dispatch function executed inside FastAPI BackgroundTasks.
    """
    global email_counter, last_reset_date

    # Auto-reset the email counter at midnight
    today = date.today()
    if today != last_reset_date:
        last_reset_date = today
        email_counter = 0

    # 🛡️ SAFEGUARD CHECK: Stop sending emails if daily cap is reached
    if email_counter >= DAILY_LIMIT:
        logger.warning(
            f"⚠️ [SAFETY CAP ACTIVATED] Daily limit of {DAILY_LIMIT} emails reached today. "
            f"Email skipped for {recipient_email}. Recorded in-app only."
        )
        return

    if not recipient_email or "@" not in recipient_email:
        logger.warning(f"⚠️ Email skipped: Invalid recipient address '{recipient_email}'")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[{ticket_number}] - {subject}"
        msg["From"] = f"Aarvi Procure Engine <{SENDER_EMAIL}>"
        msg["To"] = recipient_email

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {{ font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }}
            .container {{ max-width: 600px; background: #ffffff; margin: 0 auto; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }}
            .header {{ background-color: #2c2a57; color: #ffffff; padding: 20px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; }}
            .content {{ padding: 24px; color: #334155; line-height: 1.6; }}
            .card {{ background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 16px 0; }}
            .button {{ display: block; width: 220px; margin: 20px auto; padding: 12px 20px; background-color: #0b9c54; color: #ffffff !important; text-decoration: none; text-align: center; font-weight: bold; border-radius: 8px; font-size: 13px; }}
            .footer {{ background-color: #f1f5f9; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Aarvi Encon Procure Hub</h1>
            </div>
            <div class="content">
              <p>Dear <strong>{recipient_name}</strong>,</p>
              <p>{subject}</p>
              
              <div class="card">
                <p style="margin: 4px 0;"><strong>Ticket Ref:</strong> {ticket_number}</p>
                <p style="margin: 4px 0;"><strong>Project:</strong> {project_name}</p>
                <p style="margin: 4px 0;"><strong>Current Status:</strong> <span style="color: #0b9c54; font-weight: bold;">{status}</span></p>
              </div>

              <a href="{action_link}" class="button">Access Procurement Portal</a>
            </div>
            <div class="footer">
              Aarvi Encon Limited • SCM Automated Notification Gateway
            </div>
          </div>
        </body>
        </html>
        """

        msg.attach(MIMEText(html_body, "html"))

        # Connect to Gmail SMTP using explicit IPv4 socket and a 15s timeout
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=15)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, recipient_email, msg.as_string())
        server.quit()

        email_counter += 1
        logger.info(f"✉️ [EMAIL SENT #{email_counter}/{DAILY_LIMIT}] -> Dispatched to {recipient_email} for Ticket {ticket_number}")

    except Exception as e:
        logger.error(f"❌ [EMAIL FAILED] -> Could not send email to {recipient_email}. Error: {str(e)}")