# LT-FaultX Backend (FastAPI)

Bridges hardware telemetry/commands to Supabase and streams real-time events to
the Next.js frontend over WebSocket.

```
ESP32 -> MQTT -> FastAPI -> validate -> Supabase (Postgres) -> WebSocket -> Next.js
Website -> FastAPI -> MQTT -> ESP32 -> ACK -> FastAPI -> Supabase -> WebSocket -> Website
```

In this pass the **MQTT broker + ESP32 are simulated** — no broker or hardware is
required to run the app. Synthetic telemetry streams for the seeded demo nodes,
and relay commands run through the full PENDING → SENT → ACKED lifecycle with a
simulated ESP32 acknowledgement.

## Setup

```bash
cd backend
python -m venv .venv
# Windows (Git Bash):
source .venv/Scripts/activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env    # then edit .env
```

Edit `.env` and set the **real** service-role secret:

```
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...   # or the service_role JWT
```

> The key provided during setup was a *publishable* key, which is NOT a
> service-role secret. Without a real service-role key the app still boots and
> simulation/WebSocket work, but DB writes (telemetry persistence, relay
> commands, config, audit logs) are skipped and endpoints that require the DB
> return HTTP 503.
>
> This key is **server-only**: never expose it to the browser, `NEXT_PUBLIC_*`,
> the ESP32, or git. `.env` is gitignored.

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

- `GET  /health` — status + whether a valid service key is configured
- `GET  /api/status` — hardware mode + Supabase status
- `GET  /api/devices` — device registry (requires service key)
- `POST /api/telemetry` — validated telemetry ingest (TelemetryIn)
- `POST /api/relay` — issue relay command (returns PENDING; wait for WS ACK)
- `POST /api/config` — persist + push device configuration
- `WS   /ws/telemetry` — real-time telemetry / fault / relay-ack events

## Seed the demo auth users

After running the SQL migrations + seeds (see `../supabase/README.md`):

```bash
python scripts/seed_users.py
```

## Docker (optional)

Docker is **not required** to run the backend. It's only useful later for an
MQTT broker, isolated services, or deployment.
