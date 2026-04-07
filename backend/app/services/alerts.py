from twilio.rest import Client
from app.core.config import settings

client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

async def send_vitalvue_whatsapp(patient_name: str, patient_id: str, nurse_phone: str, vital_entry):
    """
    Sends the WhatsApp alert. 
    Ensure TWILIO_WHATSAPP_NUMBER in .env is just the number (e.g., +14155238886)
    """
    try:
        # 1. Format numbers correctly
        to_whatsapp = f"whatsapp:{nurse_phone}"
        from_whatsapp = f"whatsapp:{settings.TWILIO_WHATSAPP_NUMBER}"
        
        # 2. Construct the message
        # NOTE: If using Twilio Sandbox, the body must match your approved template or 
        # you must have an active session with the nurse.
        body_text = (
            f"🚨 *Vitalvue Critical Alert* 🚨\n\n"
            f"*Patient:* {patient_name} ({patient_id})\n"
            f"*Issue:* {vital_entry.af_warning if vital_entry.af_warning != 'Normal' else 'High NEWS2 Score'}\n\n"
            f"*Stats:* HR:{vital_entry.heart_rate} | SpO2:{vital_entry.spo2}% | NEWS2:{vital_entry.news2_score}\n"
            f"Please check the dashboard immediately."
        )

        message = client.messages.create(
            from_=from_whatsapp,
            to=to_whatsapp,
            body=body_text
        )
        print(f"WhatsApp Sent: {message.sid}")
    except Exception as e:
        print(f"Twilio Error: {e}")