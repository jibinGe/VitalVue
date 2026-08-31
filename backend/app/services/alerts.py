import json
import httpx
from app.core.config import settings

async def send_critical_alert(
    doctor_phone: str,
    patient_name: str, 
    location: str, 
    hr_value: str, 
    spo2_value: str, 
    bp_value: str,
    patient_id: str
):
    """
    Sends a critical WhatsApp alert using the MSG91 API with the 'critical_alert_red' template.
    """
    try:
        # 1. Format the phone number safely for MSG91 (remove '+')
        formatted_phone = doctor_phone.strip().replace("+", "").replace(" ", "").replace("-", "")
        if len(formatted_phone) == 10:
            formatted_phone = f"91{formatted_phone}"

        # 2. Construct the MSG91 API URL and Headers
        url = "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/"
        headers = {
            "Content-Type": "application/json",
            "authkey": settings.MSG91_AUTH_KEY  # Ensure this is added to your config/settings
        }

        # 3. Build the payload matching your exact working template
        payload = {
            "integrated_number": settings.MSG91_INTEGRATED_NUMBER, # e.g., "15559064044"
            "content_type": "template",
            "payload": {
                "messaging_product": "whatsapp",
                "type": "template",
                "template": {
                    "name": "critical_alert_red",
                    "language": {
                        "code": "en",
                        "policy": "deterministic"
                    },
                    "namespace": "6018516a_a8b9_4b08_95c1_cbce7d5a482a",
                    "to_and_components": [
                        {
                            "to": [ formatted_phone ],
                            "components": {
                                "body_patient_name": {
                                    "type": "text",
                                    "value": str(patient_name),
                                    "parameter_name": "patient_name"
                                },
                                "body_location": {
                                    "type": "text",
                                    "value": str(location),
                                    "parameter_name": "location"
                                },
                                "body_hr_value": {
                                    "type": "text",
                                    "value": str(hr_value),
                                    "parameter_name": "hr_value"
                                },
                                "body_spo2_value": {
                                    "type": "text",
                                    "value": str(spo2_value).replace("%", "").strip(),
                                    "parameter_name": "spo2_value"
                                },
                                "body_bp_value": {
                                    "type": "text",
                                    "value": str(bp_value),
                                    "parameter_name": "bp_value"
                                },
                                "button_1": {
                                    "subtype": "url",
                                    "type": "text",
                                    "value": f"patient/{patient_id}"
                                }
                            }
                        }
                    ]
                }
            }
        }

        # 4. Trigger the message asynchronously via MSG91 API
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, content=json.dumps(payload))
            response.raise_for_status()
            
            response_data = response.json()
            
            # MSG91 usually returns a messageId in a successful response
            print(f"✅ Critical Alert Sent successfully. Response: {response_data}")
            return response_data
            
    except httpx.HTTPStatusError as e:
        print(f"❌ HTTP Error sending alert: {e.response.text}")
        return None
    except Exception as e:
        print(f"❌ Detailed Error: {e}")
        return None