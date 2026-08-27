"""MQTT client abstraction.

In this pass the broker is **simulated**: no real network MQTT is required to run
the app. The interface (publish / start / stop) is shaped so a real paho-mqtt or
asyncio-mqtt implementation can drop in later without touching callers.

Simulation behaviour:
  - Periodically synthesises telemetry for the seeded demo nodes and pushes it
    through the same validate -> persist -> broadcast path as real hardware.
  - When a relay command is "published", schedules a synthetic ESP32 ACK so the
    PENDING -> SENT -> ACKED lifecycle is exercised end to end.
"""
from __future__ import annotations

import asyncio
import math
import random
from datetime import datetime, timezone
from typing import Optional

from app.config import get_settings
from app.models import TelemetryIn
from app.services import relay as relay_service
from app.services.telemetry import ingest_telemetry

# Demo nodes mirroring the seed data. NODE_04/05 are "offline" -> no telemetry.
_SIM_ONLINE_NODES = ["NODE_01", "NODE_02", "NODE_03"]


class SimulatedMqttClient:
    def __init__(self) -> None:
        self._task: Optional[asyncio.Task] = None
        self._running = False

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._telemetry_loop())

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except (asyncio.CancelledError, Exception):
                pass
            self._task = None

    async def _telemetry_loop(self) -> None:
        """Emit synthetic telemetry roughly every 3s for online demo nodes."""
        t = 0.0
        while self._running:
            for node in _SIM_ONLINE_NODES:
                reading = self._synth_reading(node, t)
                try:
                    await ingest_telemetry(reading)
                except Exception:
                    pass
            t += 1.0
            await asyncio.sleep(3.0)

    @staticmethod
    def _synth_reading(device_id: str, t: float) -> TelemetryIn:
        seed = sum(ord(c) for c in device_id)
        voltage = 230 + 4 * math.sin((t + seed) / 5) + random.uniform(-1.5, 1.5)
        current = 2.2 + 0.4 * math.sin((t + seed) / 7) + random.uniform(-0.2, 0.2)
        return TelemetryIn(
            device_id=device_id,
            timestamp=datetime.now(timezone.utc),
            voltage=round(voltage, 2),
            current=round(max(current, 0), 2),
            power=round(voltage * max(current, 0), 2),
            relay_k1=True,
            relay_k2=False,
            fault=False,
            line_status="HEALTHY",
            wifi_rssi=random.randint(-70, -45),
        )

    async def publish_relay(self, command_id: str, desired_state: bool) -> None:
        """Simulate publishing a relay command and receiving an ESP32 ACK."""
        await relay_service.mark_sent(command_id)
        # Simulated hardware round-trip delay.
        await asyncio.sleep(1.2)
        await relay_service.mark_acked(command_id, ack_state=desired_state)


def build_mqtt_client() -> SimulatedMqttClient:
    """Factory. Always returns the simulated client in this pass; a real client
    would be selected here when get_settings().hardware_mode == 'live'."""
    _ = get_settings()  # reserved for future live-mode selection
    return SimulatedMqttClient()


mqtt_client = build_mqtt_client()
