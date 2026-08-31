"""FastAPI application entrypoint.

Boots even without a valid service-role key so /health and simulation work.
The simulated MQTT loop starts on startup and streams synthetic telemetry over
the WebSocket at /ws/telemetry.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
from app.api.esp32_routes import router as esp32_router
from app.api.line_map import router as line_map_router
from app.api.exotel_routes import router as exotel_router
from app.api.simulator_routes import router as simulator_router
from app.config import get_settings
from app.services.mqtt_client import mqtt_client
from app.services.supabase_service import service_key_status
from app.ws import hub


@asynccontextmanager
async def lifespan(app: FastAPI):
    await mqtt_client.start()
    try:
        yield
    finally:
        await mqtt_client.stop()


app = FastAPI(title="LT-FaultX Backend", version="0.1.0", lifespan=lifespan)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(esp32_router)
app.include_router(line_map_router)
app.include_router(exotel_router)
app.include_router(simulator_router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "hardware_mode": settings.hardware_mode,
        "ws_clients": hub.count,
        "supabase": service_key_status(),
    }


@app.get("/")
async def root():
    return {
        "status": "ok",
        "message": "LT-FaultX Backend is running",
        "endpoints": {
            "health": "/health",
            "esp32_telemetry": "/api/devices/{device_id}/telemetry",
            "esp32_command": "/api/devices/{device_id}/command",
            "esp32_config": "/api/devices/{device_id}/config",
            "esp32_ping": "/api/devices/ping",
            "simulator_event": "/api/simulator/event",
            "simulator_state": "/api/simulator/state",
            "websocket": "/ws/telemetry",
        },
    }


@app.websocket("/ws/telemetry")
async def ws_telemetry(ws: WebSocket):
    """Primary real-time channel: telemetry / fault / relay-ack events."""
    await hub.connect(ws)
    try:
        while True:
            # We don't expect client messages, but keep the socket alive.
            await ws.receive_text()
    except WebSocketDisconnect:
        await hub.disconnect(ws)
    except Exception:
        await hub.disconnect(ws)
