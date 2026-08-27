"""Telemetry ingestion: validate -> persist to Supabase -> broadcast over WS.

The validation boundary (Pydantic model TelemetryIn) runs before this, so by the
time we're here the payload is well-formed. We still guard the DB write so the
app degrades gracefully when no service-role key is set.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.models import TelemetryIn
from app.services.supabase_service import (
    SupabaseUnavailable,
    get_client,
    resolve_device_uuid,
)
from app.ws import hub


async def ingest_telemetry(payload: TelemetryIn) -> dict[str, Any]:
    """Persist a validated telemetry reading (best-effort) and broadcast it."""
    reading_at = (payload.timestamp or datetime.now(timezone.utc)).isoformat()
    row = {
        "reading_at": reading_at,
        "voltage": payload.voltage,
        "current": payload.current,
        "power": payload.power,
        "relay_k1": payload.relay_k1,
        "relay_k2": payload.relay_k2,
        "fault": payload.fault,
        "line_status": payload.line_status,
        "wifi_rssi": payload.wifi_rssi,
    }

    persisted = False
    try:
        device_uuid = resolve_device_uuid(payload.device_id)
        if device_uuid is None:
            raise SupabaseUnavailable(f"Unknown device_id: {payload.device_id}")
        row["device_id"] = device_uuid
        client = get_client()
        client.table("telemetry").insert(row).execute()
        # Update the live status snapshot.
        client.table("device_status").upsert(
            {
                "device_id": device_uuid,
                "online": True,
                "last_seen": reading_at,
                "wifi_rssi": payload.wifi_rssi,
            }
        ).execute()
        persisted = True
    except SupabaseUnavailable:
        # No service key / unknown device: still broadcast so simulation works.
        persisted = False

    await hub.broadcast(
        "telemetry",
        {"device_id": payload.device_id, **row, "persisted": persisted},
    )
    return {"persisted": persisted, "device_id": payload.device_id}
