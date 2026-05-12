import json
from twilio.rest import Client
from app.core.config import settings

# Initialize client using settings
client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

async def send_vitalvue_whatsapp(
    doctor_phone: str, 
    patient_name: str, 
    reason: str,      
    hr: str,          
    spo2: str,        
    news2: str,       
    ward_name: str,   
    room_name: str    
):
    """
    Sends the WhatsApp alert using the standardized Vitalvue template HX95...
    """
    try:
        # 1. Format the phone number
        formatted_phone = doctor_phone.strip()
        if not formatted_phone.startswith("+"):
            formatted_phone = f"+91{formatted_phone}"

        # 2. Build the variables dictionary exactly like your reference
        # We ensure every value is a clean string to satisfy Twilio's validation
        variables = {
            "1": str(patient_name),
            "2": "HR",                   # Mapping to placeholder 2
            "3": str(int(float(hr))),    # Rounding to whole number
            "4": f"{float(spo2):.1f}",   # Rounding to 1 decimal place (e.g., 92.6)
            "5": str(int(float(news2))), # Placeholder 5
            "6": str(reason)[:60],       # Placeholder 6 (Truncated for safety)
            "7": str(room_name)          # Placeholder 7
        }

        # 3. Create the message using json.dumps for the variables
        message = client.messages.create(
            from_=f"whatsapp:{settings.TWILIO_WHATSAPP_NUMBER}",
            to=f"whatsapp:{formatted_phone}",
            content_sid="HX95ae3a89e6546205fb7cba7ac6d731f8",
            content_variables=json.dumps(variables)
        )
        
        print(f"✅ WhatsApp Escalation Sent: {message.sid}")
        
    except Exception as e:
        print(f"❌ Twilio Detailed Error: {e}")