"""Relay command lifecycle.

Flow: Website -> FastAPI -> MQTT -> ESP32 -> ACK -> MQTT -> FastAPI -> Supabase -> WS.

A command is created as PENDING, published to MQTT (SENT), then only marked ACKED
once the ESP32 acknowledgement arrives. The frontend must not display success
until status == 'ACKED'. Every command also writes an audit_logs entry.

In simulation mode (no real ESP32) the mqtt client synthesises an ACK shortly
after SENT so the full lifecycle is exercised end-to-end.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from app.models import RelayCommandIn
from app.services.supabase_service import (
    SupabaseUnavailable,
    get_client,
    resolve_device_uuid,
)
from app.ws import hub


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def create_relay_command(cmd: RelayCommandIn) -> dict[str, Any]:
    """Create a PENDING relay command + audit entry. Returns the created row."""
    try:
        client = get_client()
        device_uuid = resolve_device_uuid(cmd.device_id)
        if device_uuid is None:
            raise SupabaseUnavailable(f"Unknown device_id: {cmd.device_id}")

        row = {
            "device_id": device_uuid,
            "relay": cmd.relay,
            "desired_state": cmd.desired_state,
            "status": "PENDING",
            "issued_by": cmd.issued_by,
            "issued_at": _now(),
        }
        res = client.table("relay_commands").insert(row).execute()
        created = res.data[0]

        client.table("audit_logs").insert(
            {
                "actor_id": cmd.issued_by,
                "action": "relay.command",
                "entity_type": "device",
                "entity_id": cmd.device_id,
                "detail": {
                    "relay": cmd.relay,
                    "desired_state": cmd.desired_state,
                    "command_id": created["id"],
                },
            }
        ).execute()

        await hub.broadcast("relay_command", {**created, "device_ref": cmd.device_id})
        return created
    except SupabaseUnavailable as exc:
        # Simulation-only fallback: synth a command object without persistence.
        synth = {
            "id": f"sim-{int(datetime.now().timestamp() * 1000)}",
            "device_id": cmd.device_id,
            "relay": cmd.relay,
            "desired_state": cmd.desired_state,
            "status": "PENDING",
            "persisted": False,
            "note": str(exc),
        }
        await hub.broadcast("relay_command", synth)
        return synth


async def mark_sent(command_id: str) -> None:
    _update_status(command_id, {"status": "SENT", "sent_at": _now()})
    await hub.broadcast("relay_command", {"id": command_id, "status": "SENT"})


async def mark_acked(command_id: str, ack_state: Optional[bool]) -> None:
    _update_status(
        command_id,
        {"status": "ACKED", "acked_at": _now(), "ack_state": ack_state},
    )
    await hub.broadcast(
        "relay_command",
        {"id": command_id, "status": "ACKED", "ack_state": ack_state},
    )


async def mark_timeout(command_id: str) -> None:
    _update_status(command_id, {"status": "TIMEOUT", "error": "ACK timeout"})
    await hub.broadcast("relay_command", {"id": command_id, "status": "TIMEOUT"})


def _update_status(command_id: str, patch: dict[str, Any]) -> None:
    if str(command_id).startswith("sim-"):
        return  # simulation-only synthetic command, nothing persisted
    try:
        client = get_client()
        client.table("relay_commands").update(patch).eq("id", command_id).execute()
    except SupabaseUnavailable:
        pass
