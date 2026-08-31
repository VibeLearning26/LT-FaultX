"""Exotel API endpoints for voice/SMS callbacks and voice XML."""

from fastapi import APIRouter, Request
from fastapi.responses import Response

from app.services.exotel_service import exotel_service

router = APIRouter(prefix="/api/exotel", tags=["exotel"])


@router.get("/voice-xml")
async def get_voice_xml(incident: str = "", variant: str = "operator"):
    """Return Exotel TwiML for a voice call.

    `variant=operator` is the fault alert to the operator, `variant=emergency`
    the alert to the police station, and `variant=police` the follow-up call
    telling the operator the police station has been informed.
    """
    kind = variant if variant in {"operator", "police", "emergency"} else "operator"
    xml = exotel_service.get_voice_xml(incident, kind)  # type: ignore[arg-type]
    return Response(content=xml, media_type="application/xml")


@router.post("/callback")
async def exotel_callback(request: Request):
    """Handle Exotel call/SMS status callbacks."""
    data = await request.form()
    print(f"[Exotel Callback] {dict(data)}")
    return {"status": "ok"}
