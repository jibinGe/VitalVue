import json
from twilio.rest import Client
from app.core.config import settings

# Initialize client once
client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

async def send_vitalvue_whatsapp(
    doctor_phone: str, 
    patient_name: str, 
    reason: str, 
    nurse_name: str, 
    ward_name: str, 
    room_name: str
):
    """
    Sends the WhatsApp alert using the standardized Vitalvue template.
    """
    try:
        formatted_phone = doctor_phone.strip()
        if not formatted_phone.startswith("+"):
            formatted_phone = f"+91{formatted_phone}"

        to_whatsapp = f"whatsapp:{formatted_phone}"
        from_whatsapp = f"whatsapp:{settings.TWILIO_WHATSAPP_NUMBER}"
        
        # Mapping your template to the Manual Flag context
        body_text = (
            f"🚨 *Vitalvue Critical Alert* 🚨\n\n"
            f"*Patient:* {patient_name}\n"
            f"*Issue:* Manual Escalation detected!\n\n"
            f"*Nurse Note:* {reason}\n"
            f"*Flagged By:* {nurse_name}\n\n"
            f"Please check the dashboard immediately for *Ward {ward_name}*, *Room {room_name}* please check the patient ASAP."
        )

        message = client.messages.create(
            from_=from_whatsapp,
            to=to_whatsapp,
            body=body_text
        )
        print(f"WhatsApp Sent: {message.sid}")
    except Exception as e:
        print(f"Twilio Error: {e}")

