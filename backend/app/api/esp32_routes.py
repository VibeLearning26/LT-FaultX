"""ESP32 device endpoints: telemetry ingestion, command polling, acknowledgement."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Header, Request
from pydantic import BaseModel

from app.config import get_settings
from app.models import ESP32TelemetryIn, ESP32CommandOut, ESP32CommandAckIn
from app.services.supabase_service import (
    SupabaseUnavailable,
    get_client,
    resolve_device_uuid,
)
from app.services.telemetry import ingest_telemetry
from app.services import relay as relay_service
from app.ws import hub

router = APIRouter(prefix="/api/devices", tags=["esp32"])


async def verify_device_api_key(
    request: Request,
    x_device_api_key: Optional[str] = Header(None, alias="X-Device-API-Key"),
) -> str:
    """Verify the ESP32 device API key and return the device_id."""
    settings = get_settings()
    expected_key = settings.device_api_key
    
    if not x_device_api_key or x_device_api_key != expected_key:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing device API key",
        )
    
    # For now, we extract device_id from a custom header or the payload
    # The device_id will be validated in the specific endpoints
    return x_device_api_key


@router.post("/{device_id}/telemetry")
async def esp32_telemetry(
    device_id: str,
    payload: ESP32TelemetryIn,
    api_key: str = Depends(verify_device_api_key),
):
    """
    Receive telemetry from ESP32 via HTTP REST.
    
    ESP32 sends: voltage, current, line_status, relay_state, LED states, etc.
    Backend validates, persists to Supabase, broadcasts via WebSocket.
    """
    # Verify device_id in path matches payload
    if payload.device_id != device_id:
        raise HTTPException(
            status_code=400,
            detail="device_id in path must match payload",
        )
    
    # Convert ESP32 telemetry format to internal TelemetryIn format
    internal_payload = ESP32TelemetryIn(
        device_id=device_id,
        timestamp=payload.timestamp,
        voltage=payload.voltage_post_2,
        current=payload.current,
        power=None,  # Can be calculated if needed
        relay_k1=payload.relay_state,
        relay_k2=None,
        fault=(payload.line_status == "FAULT"),
        line_status=payload.line_status,
        wifi_rssi=payload.wifi_rssi,
    )
    
    # Ingest telemetry (validates, persists, broadcasts)
    result = await ingest_telemetry(internal_payload)
    
    # Also update device_status with ESP32-specific fields
    try:
        client = get_client()
        device_uuid = resolve_device_uuid(device_id)
        if device_uuid:
            update_data = {
                "device_id": device_uuid,
                "online": True,
                "heartbeat_ok": True,
                "last_heartbeat": datetime.now(timezone.utc).isoformat(),
                "last_seen": internal_payload.timestamp or datetime.now(timezone.utc).isoformat(),
                "comm": "OK",
                "firmware_version": payload.firmware_version,
                "wifi_rssi": payload.wifi_rssi,
            }
            client.table("device_status").upsert(update_data).execute()
    except SupabaseUnavailable:
        pass  # Simulation mode, no DB
    
    return {
        "status": "accepted",
        "device_id": device_id,
        "persisted": result.get("persisted", False),
        "server_time": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/{device_id}/command", response_model=Optional[ESP32CommandOut])
async def esp32_poll_command(
    device_id: str,
    api_key: str = Depends(verify_device_api_key),
):
    """
    ESP32 polls for pending commands.
    
    Returns the next PENDING command for this device, or 204 No Content if none.
    """
    try:
        client = get_client()
        device_uuid = resolve_device_uuid(device_id)
        if not device_uuid:
            raise HTTPException(status_code=404, detail="Unknown device")
        
        # Find the oldest PENDING command for this device
        res = client.table("relay_commands").select("*").eq("device_id", device_uuid).eq("status", "PENDING").order("issued_at").limit(1).execute()
        
        if not res.data:
            # No pending commands - return 204
            from fastapi import Response
            return Response(status_code=204)
        
        cmd = res.data[0]
        
        # Mark as SENT
        await relay_service.mark_sent(cmd["id"])
        
        return ESP32CommandOut(
            command_id=cmd["id"],
            command="OPEN_RELAY" if not cmd["desired_state"] else "CLOSE_RELAY",
            parameters={"relay": cmd["relay"], "desired_state": cmd["desired_state"]},
        )
    except SupabaseUnavailable:
        # Simulation mode - no real commands
        from fastapi import Response
        return Response(status_code=204)


@router.post("/{device_id}/command/{command_id}/ack")
async def esp32_command_ack(
    device_id: str,
    command_id: str,
    payload: ESP32CommandAckIn,
    api_key: str = Depends(verify_device_api_key),
):
    """
    ESP32 acknowledges a command execution.
    
    Updates command status and broadcasts result via WebSocket.
    """
    try:
        client = get_client()
        device_uuid = resolve_device_uuid(device_id)
        if not device_uuid:
            raise HTTPException(status_code=404, detail="Unknown device")
        
        # Verify command belongs to this device
        cmd_res = client.table("relay_commands").select("*").eq("id", command_id).eq("device_id", device_uuid).limit(1).execute()
        if not cmd_res.data:
            raise HTTPException(status_code=404, detail="Command not found for this device")
        
        if payload.status == "ACKNOWLEDGED" or payload.status == "EXECUTED":
            await relay_service.mark_acked(command_id, payload.result_state)
        elif payload.status == "FAILED":
            await relay_service.mark_timeout(command_id)  # Reuse timeout for failed
        
        return {"status": "acknowledged", "command_id": command_id}
    except SupabaseUnavailable:
        # Simulation mode
        return {"status": "acknowledged", "command_id": command_id, "note": "simulation mode"}


@router.get("/{device_id}/config")
async def esp32_get_config(
    device_id: str,
    api_key: str = Depends(verify_device_api_key),
):
    """
    ESP32 fetches its configuration from backend.
    
    Returns device_configuration row for this device.
    """
    try:
        client = get_client()
        device_uuid = resolve_device_uuid(device_id)
        if not device_uuid:
            raise HTTPException(status_code=404, detail="Unknown device")
        
        res = client.table("device_configuration").select("*").eq("device_id", device_uuid).limit(1).execute()
        
        if not res.data:
            return {"config_acked": False, "message": "No configuration found"}
        
        config = res.data[0]
        # Mark config as acknowledged by device
        client.table("device_configuration").update({"config_acked": True, "acked_at": datetime.now(timezone.utc).isoformat()}).eq("device_id", device_uuid).execute()
        
        return config
    except SupabaseUnavailable:
        return {"config_acked": False, "message": "simulation mode"}


class DeviceStatusOut(BaseModel):
    device_id: str
    online: bool
    last_seen: Optional[str]
    voltage: Optional[float]
    current: Optional[float]
    line_status: Optional[str]
    relay_state: Optional[bool]
    fault: bool
    comm: str
    firmware_version: Optional[str]
    wifi_rssi: Optional[int]


@router.get("/{device_id}/status", response_model=DeviceStatusOut)
async def get_device_status(
    device_id: str,
):
    """Get current device status for frontend dashboard."""
    try:
        client = get_client()
        device_uuid = resolve_device_uuid(device_id)
        if not device_uuid:
            raise HTTPException(status_code=404, detail="Unknown device")
        
        # Get device_status
        status_res = client.table("device_status").select("*").eq("device_id", device_uuid).limit(1).execute()
        
        # Get latest telemetry
        telemetry_res = client.table("telemetry").select("*").eq("device_id", device_uuid).order("reading_at", desc=True).limit(1).execute()
        
        status = status_res.data[0] if status_res.data else {}
        telemetry = telemetry_res.data[0] if telemetry_res.data else {}
        
        return DeviceStatusOut(
            device_id=device_id,
            online=status.get("online", False),
            last_seen=status.get("last_seen"),
            voltage=telemetry.get("voltage"),
            current=telemetry.get("current"),
            line_status=telemetry.get("line_status"),
            relay_state=telemetry.get("relay_k1"),
            fault=telemetry.get("fault", False),
            comm=status.get("comm", "UNKNOWN"),
            firmware_version=status.get("firmware_version"),
            wifi_rssi=status.get("wifi_rssi"),
        )
    except SupabaseUnavailable:
        raise HTTPException(status_code=503, detail="Service unavailable")