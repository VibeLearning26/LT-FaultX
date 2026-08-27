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
