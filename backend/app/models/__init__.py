"""Pydantic request/response models — the validation boundary before any DB write."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TelemetryIn(BaseModel):
    """ESP32 telemetry payload (arrives via MQTT -> FastAPI). Validated here
    before insertion into Supabase."""

    device_id: str = Field(..., min_length=1, description="Hardware id, e.g. LT_NODE_01")
    timestamp: Optional[datetime] = None
    voltage: Optional[float] = Field(None, ge=-1000, le=1000)
    current: Optional[float] = Field(None, ge=-1000, le=1000)
    power: Optional[float] = None
    relay_k1: Optional[bool] = None
    relay_k2: Optional[bool] = None
    fault: bool = False
    line_status: Optional[str] = None
    wifi_rssi: Optional[int] = Field(None, ge=-120, le=0)


class RelayCommandIn(BaseModel):
    """Operator/admin relay command request (Website -> FastAPI -> MQTT -> ESP32)."""

    device_id: str = Field(..., min_length=1)
    relay: str = Field(..., pattern="^(k1|k2)$")
    desired_state: bool
    issued_by: Optional[str] = None  # profile uuid of the requester


class RelayCommandOut(BaseModel):
    id: str
    device_id: str
    relay: str
    desired_state: bool
    status: str
    ack_state: Optional[bool] = None
    error: Optional[str] = None


class ConfigIn(BaseModel):
    """Device configuration push (Website -> FastAPI -> Supabase -> MQTT -> ESP32)."""

    device_id: str = Field(..., min_length=1)
    current_zero_offset: Optional[float] = None
    current_sensitivity: Optional[float] = None
    voltage_calibration: Optional[float] = None
    voltage_fault_threshold: Optional[float] = None
    current_warning_threshold: Optional[float] = None
    fault_debounce_ms: Optional[int] = Field(None, ge=0, le=60000)
    telemetry_interval_ms: Optional[int] = Field(None, ge=100, le=600000)
    auto_isolation_enabled: Optional[bool] = None
    buzzer_enabled: Optional[bool] = None
    demo_mode: Optional[bool] = None
    updated_by: Optional[str] = None


class ESP32TelemetryIn(BaseModel):
    """ESP32 telemetry payload via HTTP REST (ESP32 -> FastAPI)."""

    device_id: str = Field(..., min_length=1, description="Hardware id, e.g. ESP32-POLE-01")
    timestamp: Optional[datetime] = None
    voltage_post_2: Optional[float] = Field(None, ge=0, le=30, description="Voltage at Post 2 (V)")
    current: Optional[float] = Field(None, ge=0, le=10, description="Line current (A)")
    line_status: Optional[str] = Field(None, description="HEALTHY | FAULT | ISOLATED | STARTING")
    relay_state: Optional[bool] = None
    green_led: Optional[bool] = None
    red_led: Optional[bool] = None
    buzzer: Optional[bool] = None
    load_1: Optional[bool] = None
    load_2: Optional[bool] = None
    wifi_rssi: Optional[int] = Field(None, ge=-120, le=0)
    uptime_seconds: Optional[int] = Field(None, ge=0)
    firmware_version: Optional[str] = None
    sequence_number: Optional[int] = Field(None, ge=0)


class ESP32CommandOut(BaseModel):
    """Command for ESP32 to execute."""

    command_id: str
    command: str = Field(..., description="OPEN_RELAY | CLOSE_RELAY | RESET_FAULT | REQUEST_STATUS")
    parameters: dict = Field(default_factory=dict)


class ESP32CommandAckIn(BaseModel):
    """ESP32 command acknowledgement."""

    command_id: str
    status: str = Field(..., description="ACKNOWLEDGED | EXECUTED | FAILED")
    result_state: Optional[bool] = None
    message: Optional[str] = None


# ---------------------------------------------------------------------------
# Fault Simulator (software-only). Events are tagged source=SIMULATOR so they
# are always distinguishable from REAL_HARDWARE events, while still traversing
# the same detection/notification pipeline.
# ---------------------------------------------------------------------------

class SimulatorGeo(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class SimulatorEventIn(BaseModel):
    """Fault/recovery event emitted by the /Simulator scene."""

    source: str = Field("SIMULATOR", pattern="^SIMULATOR$")
    device_id: Optional[str] = Field(None, min_length=1, max_length=64)
    event: str = Field(
        ...,
        pattern="^(LINE_BREAK|FUSE_FAILURE|PERSON_CONTACT|RESET)$",
        description="LINE_BREAK | FUSE_FAILURE | PERSON_CONTACT | RESET",
    )
    status: Optional[str] = Field(None, pattern="^(FAULT|NORMAL)$")
    timestamp: Optional[datetime] = None
    location: Optional[SimulatorGeo] = None
    note: Optional[str] = Field(None, max_length=280)


class SimulatorLogEntry(BaseModel):
    at: str
    stage: str = Field(..., description="DETECTION | PROCESSING | AUTOMATION | NOTIFICATION | RECOVERY")
    message: str
    detail: Optional[str] = None


class SimulatorPort(BaseModel):
    """A feeder port on the simulated node."""

    id: str
    role: str = Field(..., description="PRIMARY | BACKUP")
    status: str = Field(..., description="HEALTHY | FAULT | CARRYING | STANDBY")
    energised: bool
    carrying: bool
    load_pct: int = Field(0, ge=0, le=100)


class SimulatorStateOut(BaseModel):
    source: str = "SIMULATOR"
    state: str = Field(..., description="SYSTEM_NORMAL | FAULT_TRIGGERED | LINE_BROKEN | PERSON_SHOCKED | FAULT_ACTIVE | LINE_REGENERATED")
    device_id: str
    line_connected: bool
    fuse_ok: bool
    person_shocked: bool
    fault_active: bool
    fault_id: Optional[str] = None
    fault_type: Optional[str] = None
    fault_status: Optional[str] = None
    detected_at: Optional[str] = None
    resolved_at: Optional[str] = None
    latitude: float
    longitude: float
    pincode: str
    area: str
    pole: str
    operator_id: Optional[str] = None
    operator_name: Optional[str] = None
    operator_notified: bool = False
    users_notified: int = 0
    emergency_status: str = "NONE"
    emergency_service: Optional[str] = None
    map_marker_status: str = "NORMAL"
    notifications_configured: bool = False
    ports: list[SimulatorPort] = Field(default_factory=list)
    active_port: Optional[str] = None
    rerouted: bool = False
    log: list[SimulatorLogEntry] = Field(default_factory=list)
