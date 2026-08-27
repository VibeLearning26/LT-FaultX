"""REST routes: telemetry ingest, relay control, config push, device reads."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.config import get_settings
from app.models import ConfigIn, RelayCommandIn, TelemetryIn
from app.services import relay as relay_service
from app.services.mqtt_client import mqtt_client
from app.services.supabase_service import (
    SupabaseUnavailable,
    get_client,
    resolve_device_uuid,
    service_key_status,
)
from app.services.telemetry import ingest_telemetry

router = APIRouter(prefix="/api")


@router.get("/status")
async def status():
    settings = get_settings()
    return {
        "hardware_mode": settings.hardware_mode,
        "supabase": service_key_status(),
    }


@router.post("/telemetry")
async def post_telemetry(payload: TelemetryIn):
    """Validated telemetry ingest (normally called by the MQTT bridge)."""
    return await ingest_telemetry(payload)


@router.get("/devices")
async def list_devices():
    try:
        client = get_client()
        res = client.table("devices").select("*").order("sequence").execute()
        return {"devices": res.data}
    except SupabaseUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.post("/relay")
async def post_relay(cmd: RelayCommandIn):
    """Issue a relay command. Returns the PENDING command immediately — the
    frontend must wait for an 'ACKED' event over the WebSocket before showing
    success."""
    created = await relay_service.create_relay_command(cmd)
    command_id = created.get("id")
    # Kick off the (simulated) MQTT publish + ACK lifecycle in the background.
    if command_id:
        import asyncio

        asyncio.create_task(mqtt_client.publish_relay(command_id, cmd.desired_state))
    return {
        "command": created,
        "message": "Command queued. Awaiting ESP32 acknowledgement.",
    }


@router.post("/config")
async def post_config(cfg: ConfigIn):
    """Persist a device configuration change, then (simulated) push to the ESP32."""
    try:
        client = get_client()
        device_uuid = resolve_device_uuid(cfg.device_id)
        if device_uuid is None:
            raise HTTPException(status_code=404, detail="Unknown device")
        patch = {
            k: v
            for k, v in cfg.model_dump(exclude={"device_id"}).items()
            if v is not None
        }
        patch["device_id"] = device_uuid
        patch["config_acked"] = False
        client.table("device_configuration").upsert(patch).execute()
        client.table("audit_logs").insert(
            {
                "actor_id": cfg.updated_by,
                "action": "config.update",
                "entity_type": "device",
                "entity_id": cfg.device_id,
                "detail": patch,
            }
        ).execute()
        return {"ok": True, "message": "Config saved. Awaiting device ACK."}
    except SupabaseUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc))
