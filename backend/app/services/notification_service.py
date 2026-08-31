"""Notification service — dispatches SMS and voice calls via Exotel."""

from __future__ import annotations

from app.services.exotel_service import exotel_service, DEFAULT_OPERATOR_PHONE

# Default notification recipients (from spec)
DEFAULT_SMS_RECIPIENTS = [
    "+916238786706",  # Primary operator
]


async def notify_fault_incident(
    incident_id: str,
    device_id: str,
    severity: str = "HIGH",
    custom_message: str | None = None,
) -> dict:
    """
    Dispatch notifications for a new fault incident.

    - Voice call to primary operator
    - SMS to all configured recipients
    """
    message = custom_message or (
        f"FAULT ALERT [{severity}]: Incident {incident_id} detected at device {device_id}. "
        f"Check FaultX dashboard immediately."
    )

    results = {
        "calls": [],
        "sms": [],
    }

    # Voice call to operator
    call_sid = await exotel_service.make_call(DEFAULT_OPERATOR_PHONE, incident_id)
    if call_sid:
        results["calls"].append({"to": DEFAULT_OPERATOR_PHONE, "sid": call_sid})

    # SMS to all recipients
    for phone in DEFAULT_SMS_RECIPIENTS:
        sms_sid = await exotel_service.send_sms(phone, message)
        if sms_sid:
            results["sms"].append({"to": phone, "sid": sms_sid})

    return results


async def notify_restoration(
    incident_id: str,
    device_id: str,
) -> dict:
    """Notify that power has been restored."""
    message = (
        f"RESTORED: Incident {incident_id} at device {device_id} has been resolved. "
        f"Power is now available."
    )

    results = {"sms": []}
    for phone in DEFAULT_SMS_RECIPIENTS:
        sms_sid = await exotel_service.send_sms(phone, message)
        if sms_sid:
            results["sms"].append({"to": phone, "sid": sms_sid})

    return results


# ---------------------------------------------------------------------------
# Recipient-explicit dispatch. Used by callers (e.g. the fault simulator) that
# resolve recipients from configuration instead of relying on module defaults.
# ---------------------------------------------------------------------------

async def dispatch_sms(recipients: list[str], message: str) -> list[dict]:
    """Send one SMS per configured recipient. Returns per-recipient outcome."""
    out: list[dict] = []
    for phone in [p for p in recipients if p]:
        try:
            sid = await exotel_service.send_sms(phone, message)
        except Exception as exc:  # never let telephony break the pipeline
            out.append({"to": phone, "sid": None, "error": str(exc)})
            continue
        out.append({"to": phone, "sid": sid, "delivered": bool(sid)})
    return out


async def dispatch_call(recipient: str, incident_id: str, variant: str = "operator") -> dict:
    """Place a voice call to an explicitly supplied recipient.

    `variant` selects which script Exotel will fetch from /api/exotel/voice-xml:
    "operator" (fault alert) or "police" (police-informed follow-up).
    """
    if not recipient:
        return {"to": None, "sid": None, "delivered": False, "error": "no recipient configured"}
    try:
        sid = await exotel_service.make_call(recipient, incident_id, variant)  # type: ignore[arg-type]
    except Exception as exc:
        return {"to": recipient, "sid": None, "delivered": False, "error": str(exc)}
    return {"to": recipient, "sid": sid, "delivered": bool(sid), "variant": variant}
