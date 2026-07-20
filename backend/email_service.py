# email_service.py
import os
import json
import logging
import urllib.request
import urllib.error
from datetime import date

logger = logging.getLogger("AarviProcure")

# -------------------------------------------------------------------
# RESEND HTTP API CONFIGURATION (Bypasses Render SMTP Port Blocking)
# -------------------------------------------------------------------
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "re_U6fhyFuw_53Foe6AamgpdcUhpHPc9FHWq")

# NOTE: Since you are on the free Resend tier, you MUST send from onboarding@resend.dev
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "Aarvi Procure <onboarding@resend.dev>")

# -------------------------------------------------------------------
# 🛡️ DAILY EMAIL SAFETY CAP ENGINE
# -------------------------------------------------------------------
DAILY_LIMIT = 400
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
    global email_counter, last_reset_date

    # Auto-reset counter at midnight
    today = date.today()
    if today != last_reset_date:
        last_reset_date = today
        email_counter = 0

    if email_counter >= DAILY_LIMIT:
        logger.warning(f"⚠️ [SAFETY CAP] Daily limit reached ({DAILY_LIMIT}). Email skipped for {recipient_email}.")
        return

    if not recipient_email or "@" not in recipient_email:
        logger.warning(f"⚠️ Email skipped: Invalid recipient address '{recipient_email}'")
        return

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

    payload = {
        "from": SENDER_EMAIL,
        "to": [recipient_email],
        "subject": f"[{ticket_number}] - {subject}",
        "html": html_body
    }

    try:
        url = "https://api.resend.com/emails"
        data = json.dumps(payload).encode("utf-8")
        
        req = urllib.request.Request(
            url, 
            data=data, 
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json"
            },
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=15) as response:
            res_body = json.loads(response.read().decode("utf-8"))
            email_counter += 1
            logger.info(f"✉️ [EMAIL SENT #{email_counter}/{DAILY_LIMIT}] -> Dispatched via Resend API to {recipient_email} (ID: {res_body.get('id')})")

    except urllib.error.HTTPError as e:
        error_resp = e.read().decode('utf-8')
        logger.error(f"❌ [EMAIL FAILED HTTP {e.code}] -> Could not send to {recipient_email}. Details: {error_resp}")
    except Exception as e:
        logger.error(f"❌ [EMAIL FAILED] -> Could not send email to {recipient_email}. Error: {str(e)}")