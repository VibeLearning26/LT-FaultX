"""Line map fault injection endpoint."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.supabase_service import SupabaseUnavailable, resolve_device_uuid
from app.services.telemetry import ingest_telemetry
from app.ws import hub

router = APIRouter(prefix="/api/line-map", tags=["line-map"])


class LineMapFaultIn(BaseModel):
    device_id: str = "ESP32-POLE-01"
    fault: bool
    wire_id: Optional[str] = None
    wire_label: Optional[str] = None
    voltage_post_2: Optional[float] = None
    current: Optional[float] = None


@router.post("/fault")
async def inject_line_fault(payload: LineMapFaultIn):
    """
    Inject a fault from the visual line map UI.

    When a wire is clicked in the frontend, this endpoint creates a
    synthetic telemetry event that flows through the same pipeline as
    real ESP32 data (ingest -> broadcast -> frontend dashboard).
    """
    try:
        from app.services.supabase_service import get_client

        client = get_client()
        device_uuid = resolve_device_uuid(payload.device_id)
        if not device_uuid:
            raise HTTPException(status_code=404, detail="Unknown device")

        # Build synthetic telemetry matching ESP32TelemetryIn format
        voltage = payload.voltage_post_2 if payload.voltage_post_2 is not None else (0.0 if payload.fault else 12.0)
        current = payload.current if payload.current is not None else (0.0 if payload.fault else 0.42)
        line_status = "FAULT" if payload.fault else "HEALTHY"

        from app.models import TelemetryIn
        internal = TelemetryIn(
            device_id=device_uuid,
            timestamp=datetime.now(timezone.utc).isoformat(),
            voltage=voltage,
            current=current,
            power=None,
            relay_k1=not payload.fault,
            relay_k2=None,
            fault=payload.fault,
            line_status=line_status,
            wifi_rssi=0,
        )

        await ingest_telemetry(internal)

        return {
            "status": "accepted",
            "device_id": payload.device_id,
            "fault": payload.fault,
            "wire": payload.wire_label or payload.wire_id,
            "message": f"Fault {'injected' if payload.fault else 'cleared'} for {payload.wire_label or payload.wire_id}",
        }
    except SupabaseUnavailable:
        return {
            "status": "simulation",
            "device_id": payload.device_id,
            "fault": payload.fault,
            "note": "Supabase not configured — running in simulation mode",
        }
