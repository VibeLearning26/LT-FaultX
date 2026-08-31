"""Fault Simulator API — software-only fault injection for /Simulator.

Every event is validated (``SimulatorEventIn``) before it reaches the shared
telemetry pipeline, and every event is tagged ``source="SIMULATOR"``. No relay,
MQTT or hardware command is ever issued from here.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models import SimulatorEventIn, SimulatorStateOut
from app.services import simulator_service

router = APIRouter(prefix="/api/simulator", tags=["simulator"])


@router.get("/config")
async def simulator_config():
    """Location / operator / notification configuration for the scene."""
    return simulator_service.get_config()


@router.get("/state", response_model=SimulatorStateOut)
async def simulator_state():
    """Authoritative simulator state — used to rehydrate after a page refresh."""
    return simulator_service.get_state()


@router.post("/event")
async def simulator_event(payload: SimulatorEventIn):
    """Handle a scene interaction: LINE_BREAK | FUSE_FAILURE | PERSON_CONTACT | RESET."""
    try:
        return await simulator_service.handle_event(payload)
    except Exception as exc:  # surface a clean error, keep the server alive
        raise HTTPException(status_code=500, detail=f"simulator event failed: {exc}") from exc
