import os
import logging

log = logging.getLogger(__name__)
_app = None


def _init():
    """Lazy-init firebase_admin from GOOGLE_APPLICATION_CREDENTIALS. On ANY failure, disable
    (set _app=False) so push becomes a silent no-op and never breaks ingest."""
    global _app
    if _app is not None:
        return _app
    try:
        import firebase_admin
        from firebase_admin import credentials
        _app = firebase_admin.initialize_app(credentials.Certificate(os.environ["GOOGLE_APPLICATION_CREDENTIALS"]))
    except Exception as e:
        log.warning("FCM disabled: %s", e)
        _app = False
    return _app


def send_critical_push(tokens, alert: dict):
    """Send a high-priority DATA message to the given FCM tokens. No-op if no tokens or creds missing."""
    if not tokens:
        return
    if _init() is False:
        return
    from firebase_admin import messaging
    msg = messaging.MulticastMessage(
        tokens=list(tokens),
        data={"type": "critical_alert", "patient_id": str(alert.get("patient_id", "")),
              "alert_id": str(alert.get("alert_id", "")), "vital_type": str(alert.get("vital_type", "")),
              "title": str(alert.get("title", "Critical alert")), "body": str(alert.get("body", ""))},
        android=messaging.AndroidConfig(priority="high"),
    )
    try:
        messaging.send_each_for_multicast(msg)
    except Exception as e:
        log.warning("FCM send failed: %s", e)


async def staff_tokens_for_patient(db, patient_id):
    """FCM tokens for the patient's assigned nurse + doctor ONLY (never the patient). Safe [] on any miss."""
    try:
        from app.models.user import Patient
        from app.models.notification import DeviceToken
        from sqlalchemy import select

        patient = (await db.execute(select(Patient).where(Patient.id == patient_id))).scalar_one_or_none()
        if not patient:
            return []
        staff_ids = [sid for sid in (patient.nurse_id, patient.doctor_id) if sid is not None]
        if not staff_ids:
            return []
        rows = await db.execute(select(DeviceToken.token).where(DeviceToken.user_id.in_(staff_ids)))
        return list(rows.scalars().all())
    except Exception as e:
        log.warning("Failed to fetch staff tokens for patient %s: %s", patient_id, e)
        return []
