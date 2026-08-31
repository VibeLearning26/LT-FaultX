"""Exotel telephony service for voice calls and SMS.

Two things live here beyond the raw REST wrappers:

* **Incident-aware message bodies** — `operator_sms`, `public_sms`,
  `police_sms` render the location, pincode and landmark of the actual fault
  instead of a generic "check the dashboard" string.
* **An incident registry** — Exotel fetches the voice XML *from us* at call
  time, over a plain GET with only the query string we handed it. The call
  context therefore has to be parked somewhere the route handler can find it,
  keyed by incident id, so the spoken script can name the place.
"""

from __future__ import annotations

from collections import OrderedDict
from typing import Literal
from xml.sax.saxutils import escape

import httpx
from app.config import get_settings

# Default operator phone (from spec)
DEFAULT_OPERATOR_PHONE = "+916238786706"

# Which script a voice call should play.
VoiceVariant = Literal["operator", "police", "emergency"]

# ---------------------------------------------------------------------------
# Incident context registry
# ---------------------------------------------------------------------------

_MAX_INCIDENTS = 50
_incidents: "OrderedDict[str, dict]" = OrderedDict()


def register_incident(incident_id: str, **fields) -> dict:
    """Park the context for an incident so the voice XML route can speak it."""
    ctx = _incidents.pop(incident_id, {})
    ctx.update({k: v for k, v in fields.items() if v is not None})
    _incidents[incident_id] = ctx
    while len(_incidents) > _MAX_INCIDENTS:
        _incidents.popitem(last=False)
    return ctx


def incident_context(incident_id: str) -> dict:
    """Context for an incident, falling back to the configured simulator site."""
    s = get_settings()
    base = {
        "fault_type": "LINE BREAK",
        "area": s.simulator_area,
        "pincode": s.simulator_pincode,
        "landmark": s.simulator_landmark,
        "latitude": s.simulator_latitude,
        "longitude": s.simulator_longitude,
        "pole": s.simulator_pole_label,
        "operator_name": s.simulator_operator_name,
        "police_name": s.emergency_service_name or "the local police station",
    }
    base.update(_incidents.get(incident_id, {}))
    return base


def _spell_pincode(pincode: str) -> str:
    """`670632` -> `6 7 0 6 3 2` so TTS reads digits instead of "six hundred"."""
    return " ".join(ch for ch in str(pincode) if ch.isdigit())


def _near(landmark: str | None) -> str:
    return f", near {landmark}" if landmark else ""


# ---------------------------------------------------------------------------
# Message bodies (SMS)
# ---------------------------------------------------------------------------

def operator_sms(incident_id: str) -> str:
    c = incident_context(incident_id)
    lines = [
        "LT-FaultX ALERT",
        f"A possible {str(c['fault_type']).lower()} has been detected near {c['area']}.",
        f"PIN Code: {c['pincode']}",
    ]
    if c.get("landmark"):
        lines.append(f"Landmark: near {c['landmark']}")
    lines += [
        f"Location: {c['latitude']:.4f}, {c['longitude']:.4f}",
        f"Pole/Span: {c['pole']}",
        f"Fault ID: {incident_id}",
        "Please check the affected line immediately.",
    ]
    return "\n".join(lines)


def public_sms(incident_id: str) -> str:
    c = incident_context(incident_id)
    return (
        "LT-FaultX SAFETY ALERT\n"
        f"A {str(c['fault_type']).lower()} has been detected near {c['area']} "
        f"(PIN {c['pincode']}){_near(c.get('landmark'))}.\n"
        "Electricity supply in your area may be interrupted. A conductor may be down - "
        "keep away from poles, wires and puddles until restoration is confirmed.\n"
        "The maintenance crew has been notified."
    )


def police_sms(incident_id: str) -> str:
    c = incident_context(incident_id)
    return (
        "LT-FaultX EMERGENCY\n"
        f"{c['fault_type']} - live conductor down near {c['area']} "
        f"(PIN {c['pincode']}){_near(c.get('landmark'))}.\n"
        f"Location: {c['latitude']:.4f}, {c['longitude']:.4f}\n"
        f"Fault ID: {incident_id}\n"
        "Public access restriction requested. Electricity crew has been dispatched."
    )


class ExotelService:
    """Handle Exotel voice calls and SMS."""

    def __init__(self):
        settings = get_settings()
        self.api_key = getattr(settings, "exotel_api_key", "")
        self.api_token = getattr(settings, "exotel_api_token", "")
        self.account_sid = getattr(settings, "exotel_account_sid", "")
        self.caller_id = getattr(settings, "exotel_caller_id", "")
        self.base_url = f"https://{self.api_key}:{self.api_token}@api.exotel.com/v1/Accounts/{self.account_sid}"

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_token and self.account_sid)

    async def make_call(
        self,
        to_number: str,
        incident_id: str,
        variant: VoiceVariant = "operator",
    ) -> str | None:
        """Initiate a voice call that plays the `variant` script for `incident_id`."""
        if not self.is_configured:
            return None

        settings = get_settings()
        voice_url = (
            f"{settings.base_url}/api/exotel/voice-xml"
            f"?incident={incident_id}&variant={variant}"
        )

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/Calls/connect",
                    data={
                        "From": self.caller_id,
                        "To": to_number,
                        "CallerId": self.caller_id,
                        "CallType": "trans",
                        "Url": voice_url,
                        "StatusCallback": f"{settings.base_url}/api/exotel/callback",
                    }
                )
                response.raise_for_status()
                data = response.json()
                return data.get("Call", {}).get("Sid")
            except Exception as e:
                print(f"[Exotel] Call failed: {e}")
                return None

    async def send_sms(self, to_number: str, message: str) -> str | None:
        """Send SMS notification."""
        if not self.is_configured:
            return None

        settings = get_settings()

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/Sms/send",
                    data={
                        "From": self.caller_id,
                        "To": to_number,
                        "Body": message,
                        "Priority": "high",
                        "StatusCallback": f"{settings.base_url}/api/exotel/callback",
                    }
                )
                response.raise_for_status()
                data = response.json()
                return data.get("SMSMessage", {}).get("Sid")
            except Exception as e:
                print(f"[Exotel] SMS failed: {e}")
                return None

    def get_voice_xml(self, incident_id: str, variant: VoiceVariant = "operator") -> str:
        """Exotel TwiML for the incident, in either the operator or police script.

        The pincode is spelled digit by digit — TTS otherwise reads "670632" as
        a number, which is unusable over a phone line.
        """
        c = incident_context(incident_id)
        area = escape(str(c["area"]))
        pin = _spell_pincode(c["pincode"])
        landmark = escape(str(c["landmark"])) if c.get("landmark") else ""
        where = f", near {landmark}" if landmark else ""
        fault = escape(str(c["fault_type"])).lower()
        station = escape(str(c["police_name"]))

        if variant == "emergency":
            # Spoken to the police station itself.
            body = (
                f"This is an automated emergency alert from Fault X, the L T line "
                f"fault detection system. A {fault} has been detected near "
                f"{area}{where}, pin code {pin}. A live conductor may be down on "
                f"the road. Public access restriction is requested at the "
                f"location. The electricity maintenance crew has been notified."
            )
            repeat = (
                f"Repeat. A {fault} with a possible live conductor down near "
                f"{area}, pin code {pin}."
            )
        elif variant == "police":
            body = (
                f"This is a follow up alert from Fault X. "
                f"The {fault} near {area}{where}, pin code {pin}, "
                f"has been reported to {station}. "
                f"Emergency services have been informed and a public access "
                f"restriction has been requested at the fault location. "
                f"Please coordinate with them while restoring the line."
            )
            repeat = (
                f"Repeat. {station} has been informed about the {fault} "
                f"near {area}, pin code {pin}."
            )
        else:
            body = (
                f"This is an automated alert from Fault X, the L T line fault "
                f"detection system. A possible {fault} has been detected near "
                f"{area}{where}, pin code {pin}. "
                f"Please check the affected line immediately and dispatch a "
                f"maintenance crew to the location."
            )
            repeat = (
                f"Repeat. A possible {fault} has been detected near {area}, "
                f"pin code {pin}. Please check the affected line immediately."
            )

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="woman" language="en-IN">{body}</Say>
    <Pause length="1"/>
    <Say voice="woman" language="en-IN">{repeat}</Say>
    <Hangup/>
</Response>"""


# Singleton
exotel_service = ExotelService()
