"""Fault Simulator service — software-only fault injection test harness.

This module does NOT implement a parallel automation system. It converts a
simulator scene interaction into a real telemetry event and pushes it through
the same pipeline that ESP32 hardware uses:

    Simulator event -> ingest_telemetry() -> Supabase (best effort)
                                          -> hub.broadcast("telemetry")
                                          -> notification dispatch (Exotel)
                                          -> hub.broadcast("simulator")

Everything it emits is tagged ``source="SIMULATOR"`` so it is always
distinguishable from ``REAL_HARDWARE`` events. It never touches relays, MQTT,
or any physical output — it only produces software events.

Recipients (operator phone, affected-user phones, emergency service) are read
from configuration/environment. No contact detail is hardcoded here.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any, Optional

from app.config import get_settings
from app.models import SimulatorEventIn, TelemetryIn
from app.services.exotel_service import (
    operator_sms,
    police_sms,
    public_sms,
    register_incident,
)
from app.services.notification_service import dispatch_call, dispatch_sms
from app.services.telemetry import ingest_telemetry
from app.ws import hub

MAX_LOG = 120

# Pending police-follow-up calls, kept referenced so the event loop cannot
# garbage-collect them mid-wait, and cancellable on RESET.
_followup_tasks: set[asyncio.Task] = set()

# Fault id the follow-up call has already been queued for, so a second
# escalation (e.g. pedestrian contact) does not ring the operator twice.
_followup_for: str | None = None

# Nominal LT values used to synthesise a plausible reading for the simulated span.
NOMINAL_VOLTAGE = 230.0
NOMINAL_CURRENT = 4.2


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class SimulatorState:
    """Single source of truth for the simulator, mirrored to the browser.

    In-memory by design: the simulator is a test harness, and the authoritative
    fault record itself lands in Supabase through ``ingest_telemetry``.
    """

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self.reset_state(initial=True)

    # ---------------------------------------------------------------- state
    def reset_state(self, initial: bool = False) -> None:
        s = get_settings()
        self.state = "SYSTEM_NORMAL"
        self.line_connected = True
        self.fuse_ok = True
        self.person_shocked = False
        self.fault_active = False
        self.fault_id: Optional[str] = None
        self.fault_type: Optional[str] = None
        self.fault_status: Optional[str] = None
        self.detected_at: Optional[str] = None
        self.resolved_at: Optional[str] = None
        self.operator_notified = False
        self.users_notified = 0
        self.emergency_status = "NONE"
        self.emergency_service: Optional[str] = None
        self.map_marker_status = "NORMAL"
        self.active_port = s.simulator_port_primary
        self.rerouted = False
        self._seq = getattr(self, "_seq", 0)
        if initial:
            self.log: list[dict[str, Any]] = []
            self.append_log("RECOVERY", "Simulator initialised — system NORMAL",
                            f"device {s.simulator_device_id} · carrying on {self.active_port}")

    def ports(self) -> list[dict[str, Any]]:
        """Feeder ports on the simulated node, including reroute state.

        PRIMARY carries load while healthy. On a fault the signal is rerouted to
        the BACKUP port so downstream supply is maintained — the same behaviour
        a real segmented feeder would show.
        """
        s = get_settings()
        primary_faulted = self.fault_active
        return [
            {
                "id": s.simulator_port_primary,
                "role": "PRIMARY",
                "status": "FAULT" if primary_faulted else "HEALTHY",
                "energised": not primary_faulted,
                "carrying": not primary_faulted,
                "load_pct": 0 if primary_faulted else 68,
            },
            {
                "id": s.simulator_port_backup,
                "role": "BACKUP",
                "status": "CARRYING" if primary_faulted else "STANDBY",
                "energised": True,
                "carrying": primary_faulted,
                "load_pct": 74 if primary_faulted else 0,
            },
        ]


    def append_log(self, stage: str, message: str, detail: Optional[str] = None) -> dict[str, Any]:
        entry = {"at": _now_iso(), "stage": stage, "message": message, "detail": detail}
        self.log.insert(0, entry)
        del self.log[MAX_LOG:]
        return entry

    def snapshot(self) -> dict[str, Any]:
        s = get_settings()
        return {
            "source": "SIMULATOR",
            "state": self.state,
            "device_id": s.simulator_device_id,
            "line_connected": self.line_connected,
            "fuse_ok": self.fuse_ok,
            "person_shocked": self.person_shocked,
            "fault_active": self.fault_active,
            "fault_id": self.fault_id,
            "fault_type": self.fault_type,
            "fault_status": self.fault_status,
            "detected_at": self.detected_at,
            "resolved_at": self.resolved_at,
            "latitude": s.simulator_latitude,
            "longitude": s.simulator_longitude,
            "pincode": s.simulator_pincode,
            "area": s.simulator_area,
            "pole": s.simulator_pole_label,
            "operator_id": s.simulator_operator_id,
            "operator_name": s.simulator_operator_name,
            "operator_notified": self.operator_notified,
            "users_notified": self.users_notified,
            "emergency_status": self.emergency_status,
            "emergency_service": self.emergency_service,
            "map_marker_status": self.map_marker_status,
            "notifications_configured": bool(s.simulator_operator_phone),
            "ports": self.ports(),
            "active_port": self.active_port,
            "rerouted": self.rerouted,
            "log": self.log,
        }

    def next_fault_id(self) -> str:
        self._seq += 1
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        return f"SIM-FLT-{stamp}-{self._seq:02d}"


_state = SimulatorState()


def get_state() -> dict[str, Any]:
    return _state.snapshot()


def get_config() -> dict[str, Any]:
    """Location/topology/notification configuration for the scene (no secrets)."""
    s = get_settings()
    return {
        "device_id": s.simulator_device_id,
        "pole": s.simulator_pole_label,
        "latitude": s.simulator_latitude,
        "longitude": s.simulator_longitude,
        "pincode": s.simulator_pincode,
        "area": s.simulator_area,
        "operator_id": s.simulator_operator_id,
        "operator_name": s.simulator_operator_name,
        "port_primary": s.simulator_port_primary,
        "port_backup": s.simulator_port_backup,
        "operator_phone_configured": bool(s.simulator_operator_phone),
        "affected_users_configured": len(s.simulator_user_phones),
        "emergency_service_type": s.emergency_service_type,
        "emergency_service_name": s.emergency_service_name or None,
        "emergency_configured": bool(s.emergency_service_phone),
        "telephony_mode": "live" if _telephony_ready() else "dry-run",
    }


def _telephony_ready() -> bool:
    from app.services.exotel_service import exotel_service

    return exotel_service.is_configured


async def _broadcast_state() -> None:
    await hub.broadcast("simulator", _state.snapshot())


# --------------------------------------------------------------------------
# Pipeline
# --------------------------------------------------------------------------

async def handle_event(payload: SimulatorEventIn) -> dict[str, Any]:
    """Entry point for every simulator interaction."""
    async with _state._lock:
        if payload.event == "RESET":
            return await _handle_reset(payload)
        if payload.event == "PERSON_CONTACT":
            return await _handle_person_contact(payload)
        return await _handle_fault(payload)


async def _handle_fault(payload: SimulatorEventIn) -> dict[str, Any]:
    s = get_settings()
    fault_type = "LINE BREAK" if payload.event == "LINE_BREAK" else "FUSE FAILURE"

    # test_3: a persistent fault must not re-notify on repeated interactions.
    if _state.fault_active:
        _state.append_log(
            "PROCESSING",
            "Duplicate fault interaction ignored — fault already ACTIVE",
            f"{_state.fault_id} ({_state.fault_type})",
        )
        await _broadcast_state()
        return {"status": "duplicate", "simulator": _state.snapshot()}

    # -- stage 1: detection ------------------------------------------------
    _state.state = "FAULT_TRIGGERED"
    _state.fault_active = True
    _state.line_connected = payload.event != "LINE_BREAK"
    _state.fuse_ok = payload.event != "FUSE_FAILURE"
    _state.fault_type = fault_type
    _state.fault_status = "ACTIVE"
    _state.detected_at = (payload.timestamp or datetime.now(timezone.utc)).isoformat()
    _state.resolved_at = None
    _state.fault_id = _state.next_fault_id()

    _state.append_log("DETECTION", f"{fault_type} triggered in simulator scene",
                      payload.note or f"device {s.simulator_device_id}")

    # -- stage 2: processing through the real ingest path -------------------
    ingest = await _ingest(fault=True, line_status="FAULT")
    _state.append_log(
        "PROCESSING",
        "Fault detected by FaultX telemetry pipeline",
        f"persisted={ingest.get('persisted')} · broadcast to WebSocket clients",
    )
    _state.append_log("PROCESSING", f"Fault ID generated: {_state.fault_id}")

    lat, lng = _event_geo(payload)
    _state.append_log("PROCESSING", "Location identified",
                      f"{lat:.4f}, {lng:.4f} · {s.simulator_area}")
    _state.append_log("PROCESSING", f"PIN code identified: {s.simulator_pincode}",
                      s.simulator_area)
    _state.state = "LINE_BROKEN" if payload.event == "LINE_BREAK" else "FAULT_ACTIVE"

    # -- stage 3: automation ------------------------------------------------
    _state.active_port = s.simulator_port_backup
    _state.rerouted = True
    _state.append_log(
        "AUTOMATION",
        f"Signal rerouted {s.simulator_port_primary} → {s.simulator_port_backup}",
        f"{s.simulator_port_primary} isolated (FAULT) · downstream supply held on the backup port",
    )
    _state.append_log(
        "AUTOMATION",
        f"Operator identified: {s.simulator_operator_name} ({s.simulator_operator_id})",
        f"area {s.simulator_area}",
    )

    # -- stage 4: notification ---------------------------------------------
    await _notify(fault_type=fault_type, lat=lat, lng=lng)

    # -- stage 5: map + escalation -----------------------------------------
    _state.map_marker_status = "ACTIVE"
    _state.append_log("AUTOMATION", "Leaflet fault marker updated — status ACTIVE",
                      f"{lat:.4f}, {lng:.4f}")
    await _escalate_emergency(fault_type)
    _queue_police_followup()

    _state.state = "FAULT_ACTIVE"
    await _broadcast_state()
    return {"status": "accepted", "ingest": ingest, "simulator": _state.snapshot()}


async def _handle_person_contact(payload: SimulatorEventIn) -> dict[str, Any]:
    """Broken conductor made contact with the pedestrian in the scene."""
    if not _state.fault_active:
        return {"status": "ignored", "reason": "no active fault", "simulator": _state.snapshot()}
    if _state.person_shocked:
        await _broadcast_state()
        return {"status": "duplicate", "simulator": _state.snapshot()}

    _state.person_shocked = True
    _state.state = "PERSON_SHOCKED"
    _state.append_log(
        "DETECTION",
        "Live conductor contact with pedestrian detected (simulated)",
        "public-safety hazard — escalation required",
    )
    await _escalate_emergency(_state.fault_type or "LINE BREAK", reason="pedestrian contact")
    _queue_police_followup()
    await _broadcast_state()
    return {"status": "accepted", "simulator": _state.snapshot()}


async def _handle_reset(payload: SimulatorEventIn) -> dict[str, Any]:
    s = get_settings()
    if not _state.fault_active:
        _state.append_log("RECOVERY", "Reset requested — system already NORMAL")
        await _broadcast_state()
        return {"status": "noop", "simulator": _state.snapshot()}

    fault_id = _state.fault_id
    _state.state = "LINE_REGENERATED"

    # A pending police follow-up call must not ring after the line is back.
    global _followup_for
    _followup_for = None
    for task in list(_followup_tasks):
        task.cancel()
    if _followup_tasks:
        _state.append_log("RECOVERY", "Pending follow-up voice call cancelled",
                          "line restored before the call was placed")
    _followup_tasks.clear()

    _state.line_connected = True
    _state.fuse_ok = True
    _state.person_shocked = False
    _state.fault_status = "RESOLVED"
    _state.resolved_at = _now_iso()
    _state.append_log("RECOVERY", "RESET pressed — fuse restored, line regenerated", fault_id)

    _state.active_port = s.simulator_port_primary
    _state.rerouted = False
    _state.append_log(
        "RECOVERY",
        f"Signal restored to {s.simulator_port_primary}",
        f"{s.simulator_port_backup} returned to STANDBY",
    )

    ingest = await _ingest(fault=False, line_status="HEALTHY")
    _state.append_log(
        "RECOVERY",
        "Recovery event processed by FaultX telemetry pipeline",
        f"persisted={ingest.get('persisted')}",
    )

    restore_msg = (
        f"FaultX [SIMULATOR]: Fault {fault_id} at {s.simulator_area} "
        f"(PIN {s.simulator_pincode}) is RESOLVED. Supply restored."
    )
    recipients = ([s.simulator_operator_phone] if s.simulator_operator_phone else []) + s.simulator_user_phones
    if recipients:
        results = await dispatch_sms(recipients, restore_msg)
        delivered = sum(1 for r in results if r.get("delivered"))
        _state.append_log("NOTIFICATION", f"Restoration SMS dispatched to {len(results)} recipient(s)",
                          f"delivered={delivered} · {'live' if _telephony_ready() else 'dry-run (Exotel not configured)'}")
    else:
        _state.append_log("NOTIFICATION", "Restoration SMS skipped — no recipients configured",
                          "set SIMULATOR_OPERATOR_PHONE / SIMULATOR_AFFECTED_USER_PHONES")

    if _state.emergency_status == "NOTIFIED":
        _state.emergency_status = "STOOD_DOWN"
        _state.append_log("RECOVERY", "Emergency escalation stood down",
                          _state.emergency_service or s.emergency_service_type)

    _state.map_marker_status = "RESOLVED"
    _state.append_log("RECOVERY", "Leaflet fault marker updated — status RESOLVED", fault_id)

    # Clear active fault but keep the log as fault history.
    _state.fault_active = False
    _state.operator_notified = False
    _state.users_notified = 0
    _state.state = "SYSTEM_NORMAL"
    _state.append_log("RECOVERY", "System status NORMAL — monitoring resumed")

    await _broadcast_state()
    return {"status": "restored", "ingest": ingest, "simulator": _state.snapshot()}


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

def _event_geo(payload: SimulatorEventIn) -> tuple[float, float]:
    s = get_settings()
    if payload.location:
        return payload.location.latitude, payload.location.longitude
    return s.simulator_latitude, s.simulator_longitude


async def _ingest(fault: bool, line_status: str) -> dict[str, Any]:
    """Push a synthetic reading through the shared telemetry funnel.

    ``ingest_telemetry`` always broadcasts, even when Supabase is unavailable,
    so the simulator works with no database and no ESP32 attached.
    """
    s = get_settings()
    device_ref = s.simulator_device_id

    # Resolve to the internal uuid only if a database is actually reachable;
    # otherwise keep the human-readable id so frontend keys still match.
    try:
        from app.services.supabase_service import (  # local import: optional dep
            SupabaseUnavailable,
            resolve_device_uuid,
        )

        resolved = resolve_device_uuid(device_ref)
        if resolved:
            device_ref = resolved
    except Exception:
        pass  # simulation mode — no DB, keep SIM_NODE_01

    reading = TelemetryIn(
        device_id=device_ref,
        timestamp=datetime.now(timezone.utc),
        voltage=0.0 if fault else NOMINAL_VOLTAGE,
        current=0.0 if fault else NOMINAL_CURRENT,
        power=0.0 if fault else NOMINAL_VOLTAGE * NOMINAL_CURRENT,
        relay_k1=not fault,
        relay_k2=not fault,
        fault=fault,
        line_status=line_status,
        wifi_rssi=0,
    )
    try:
        return await ingest_telemetry(reading)
    except Exception as exc:
        # Never let persistence problems break the simulator; still notify the UI.
        await hub.broadcast(
            "telemetry",
            {
                "device_id": s.simulator_device_id,
                "voltage": reading.voltage,
                "current": reading.current,
                "fault": fault,
                "line_status": line_status,
                "persisted": False,
                "source": "SIMULATOR",
            },
        )
        return {"persisted": False, "device_id": s.simulator_device_id, "error": str(exc)}


async def _notify(fault_type: str, lat: float, lng: float) -> None:
    """Stage 4 — the notification fan-out for a detected fault.

    1. voice call to the operator with the location-specific fault script,
    2. fault SMS to the operator,
    3. safety SMS to the nearby residents.

    The police station (SMS + its own voice script) is handled by
    ``_escalate_emergency``, and the follow-up call telling the operator the
    police were informed is queued by ``_queue_police_followup`` afterwards.
    """
    s = get_settings()
    dry = "live" if _telephony_ready() else "dry-run (Exotel not configured)"
    incident = _state.fault_id or "SIM"

    # Park the incident context so /api/exotel/voice-xml can name the place
    # when Exotel fetches the script mid-call.
    register_incident(
        incident,
        fault_type=fault_type,
        area=s.simulator_area,
        pincode=s.simulator_pincode,
        landmark=s.simulator_landmark,
        latitude=lat,
        longitude=lng,
        pole=s.simulator_pole_label,
        operator_name=s.simulator_operator_name,
        police_name=s.emergency_service_name or None,
    )

    # -- 1 + 2a: operator voice call, then operator SMS --------------------
    if s.simulator_operator_phone:
        call = await dispatch_call(s.simulator_operator_phone, incident, "operator")
        _state.append_log(
            "NOTIFICATION",
            "Automated voice call placed to operator",
            f"{s.simulator_operator_name} · sid={call.get('sid')} · {dry}",
        )
        sms = await dispatch_sms([s.simulator_operator_phone], operator_sms(incident))
        _state.operator_notified = (
            any(r.get("delivered") for r in sms)
            or bool(call.get("delivered"))
            or not _telephony_ready()
        )
        _state.append_log("NOTIFICATION", "Fault SMS sent to operator",
                          f"PIN {s.simulator_pincode} · {dry}")
    else:
        _state.append_log(
            "NOTIFICATION",
            "Operator notification skipped — no operator phone configured",
            "set SIMULATOR_OPERATOR_PHONE in backend/.env (never hardcoded)",
        )

    # -- 2b: nearby residents ---------------------------------------------
    if s.simulator_user_phones:
        results = await dispatch_sms(s.simulator_user_phones, public_sms(incident))
        _state.users_notified = len(results)
        _state.append_log("NOTIFICATION", f"Safety SMS sent to {len(results)} nearby resident(s)",
                          f"PIN {s.simulator_pincode} · {dry}")
    else:
        _state.append_log("NOTIFICATION", "Nearby-resident SMS skipped — no recipients configured",
                          "set SIMULATOR_AFFECTED_USER_PHONES in backend/.env")

    # -- 2c: police station is handled by _escalate_emergency (SMS + call), so
    # it is not duplicated here. The follow-up call to the operator is queued
    # from _handle_fault once that escalation has actually gone out.


def _queue_police_followup() -> None:
    """Queue the second operator call reporting the police notification.

    Called after the emergency escalation so it only ever claims something that
    really happened. Fired as a background task: the HTTP request that
    triggered the fault must not block for the length of a phone call.
    """
    s = get_settings()
    if not (s.police_followup_call_enabled and s.simulator_operator_phone):
        return
    if _state.emergency_status != "NOTIFIED":
        return
    incident = _state.fault_id or "SIM"
    global _followup_for
    if _followup_for == incident:  # one follow-up per fault, not per escalation
        return
    _followup_for = incident
    station = _state.emergency_service or s.emergency_service_type.upper()
    _followup_tasks.add(
        asyncio.create_task(
            _police_followup_call(s.simulator_operator_phone, incident, station)
        )
    )
    _state.append_log(
        "NOTIFICATION",
        f"Follow-up call to operator queued — will report {station} notification",
        f"in {s.police_followup_delay_s}s, after the first call ends",
    )


async def _police_followup_call(operator_phone: str, incident: str, station: str) -> None:
    """Second call to the operator: the police station has been informed.

    Delayed so it does not collide with the fault call still in progress.
    """
    s = get_settings()
    try:
        await asyncio.sleep(max(0, s.police_followup_delay_s))
        call = await dispatch_call(operator_phone, incident, "police")
        _state.append_log(
            "NOTIFICATION",
            f"Follow-up voice call placed to operator — {station} informed",
            f"sid={call.get('sid')}"
            + (f" · error: {call['error']}" if call.get("error") else ""),
        )
        await _broadcast_state()
    except asyncio.CancelledError:  # simulator was reset mid-wait
        raise
    except Exception as exc:
        _state.append_log("NOTIFICATION", "Follow-up voice call failed", str(exc))
        await _broadcast_state()
    finally:
        _followup_tasks.discard(asyncio.current_task())  # type: ignore[arg-type]


async def _escalate_emergency(fault_type: str, reason: str = "live conductor down") -> None:
    s = get_settings()
    label = s.emergency_service_name or s.emergency_service_type.upper()

    if not s.emergency_service_phone:
        _state.emergency_status = "NOT_CONFIGURED"
        _state.emergency_service = None
        _state.append_log(
            "AUTOMATION",
            "Emergency escalation skipped — no emergency service configured",
            "set EMERGENCY_SERVICE_NAME / EMERGENCY_SERVICE_PHONE (no station is hardcoded)",
        )
        return

    if _state.emergency_status == "NOTIFIED":
        return

    msg = police_sms(_state.fault_id or "SIM")
    sms = await dispatch_sms([s.emergency_service_phone], msg)
    call = await dispatch_call(s.emergency_service_phone, _state.fault_id or "SIM", "emergency")
    _state.emergency_status = "NOTIFIED"
    _state.emergency_service = f"{label} ({s.emergency_service_type})"
    _state.append_log(
        "AUTOMATION",
        f"Emergency notification triggered — {label}",
        f"sms={any(r.get('delivered') for r in sms)} call_sid={call.get('sid')} · reason: {reason}",
    )
