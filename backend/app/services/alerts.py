import json
from twilio.rest import Client
from app.core.config import settings

# Initialize client using settings
client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

async def send_consolidated_vitalvue_alert(
    doctor_phone: str,
    severity: str,       # e.g., "🚨 CRITICAL", "⚠️ HIGH", "⚪ SYSTEM"
    alert_title: str,    # e.g., "Shock Alert", "Device Disconnection"
    patient_name: str,   # Patient's Full Name
    location: str,       # e.g., "Ward 3 - Room 12/Bed B"
    observations: str,   # Multi-line string showing vitals or system issues
    concern: str,        # Brief summary of the underlying concern
    action_required: str # What the clinician/staff needs to do immediately
):
    """
    Sends a consolidated, multi-purpose VitalVue alert via WhatsApp using 
    a single flexible template format.
    """
    try:
        # 1. Format the phone number safely
        formatted_phone = doctor_phone.strip()
        if not formatted_phone.startswith("+"):
            formatted_phone = f"+91{formatted_phone}"

        # 2. Build variables matching the sequential 1-7 layout of the template
        variables = {
            "1": str(severity).upper(),
            "2": str(alert_title),
            "3": str(patient_name),
            "4": str(location),
            "5": str(observations),
            "6": str(concern),
            "7": str(action_required)
        }

        # 3. Trigger the message via Twilio content API
        message = client.messages.create(
            from_=f"whatsapp:{settings.TWILIO_WHATSAPP_NUMBER}",
            to=f"whatsapp:{formatted_phone}",
            content_sid="HX02ef151daf68d705ace60f5c873286a6", # Replace with your new Twilio Content SID
            content_variables=json.dumps(variables)
        )
        
        print(f"✅ Consolidated Alert Sent successfully: {message.sid}")
        return message.sid
        
    except Exception as e:
        print(f"❌ Twilio Detailed Error: {e}")
        return None