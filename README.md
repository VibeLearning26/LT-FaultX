# LT-FaultX

**Smart Low-Tension (LT) Electrical Line Fault Detection, Localization, Isolation & Public Monitoring platform.**

> ⚠️ Hackathon prototype. Not certified for real electrical distribution deployment. All field/telemetry data shown is **simulated** unless explicitly stated. Never connect prototype hardware to a live 230V/415V line.

Detect → Localize → Isolate → Alert → Monitor → Verify → Restore, across a distributed set of LT monitoring nodes, with a live Kerala map, citizen reporting, maintenance management, and role-based dashboards.

## Current status
The repo now has three parts: the **Next.js frontend**, a **FastAPI backend**
(telemetry validation, relay lifecycle, WebSocket), and **Supabase** SQL
(schema + RLS + storage + seeds). Authentication runs on **Supabase Auth**. The
app supports both **SIMULATION** (no backend/hardware needed) and **LIVE
HARDWARE** modes, switchable from the admin console. MQTT/ESP32 remain simulated.

### Implemented
- Green/black control-room UI (Next.js 15 · React 19 · TypeScript · Tailwind)
- **Supabase Auth** with `profiles.role` (citizen/operator/admin) + RLS-enforced permissions
- Role-based route guards backed by the Supabase session
- **SIMULATION ↔ LIVE HARDWARE** data-mode toggle (cookie-driven)
- FastAPI backend: validated telemetry ingest → Supabase → WebSocket broadcast; relay command PENDING→SENT→ACKED lifecycle (no false "success" before ESP32 ACK); config push; audit logging
- Supabase schema for devices, locations, telemetry, faults, relay commands, status, config, outage reports, maintenance, notifications, audit logs, firmware + Kerala pincodes
- Interactive **Kerala map** (Leaflet): masked to Kerala, density of all 1,418 pincodes, LT nodes, line + estimated fault segment, operators, citizen-report markers
- **Pincode lookup** (India Post + GeoNames) and **citizen outage reporting** (Supabase-backed in live mode; in-memory in simulation)

### Roadmap (not yet built)
Real MQTT broker + ESP32 firmware/OTA/USB flashing · full Developer Console UI ·
fault detection/localization engine · Supabase Realtime for reports/notifications · Docker Compose · tests.

## Getting started

### Frontend
```bash
cd frontend
cp .env.local.example .env.local   # add NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev                        # http://localhost:3000
```

### Backend (FastAPI)
```bash
cd backend
python -m venv .venv && source .venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt
cp .env.example .env               # add the real service-role secret
uvicorn app.main:app --reload --port 8000
```

### Supabase
Run the SQL in `supabase/migrations/` then `supabase/seed/` (see
`supabase/README.md`), then create demo users with `backend/scripts/seed_users.py`.

### Demo accounts (created by the seed script)
| Role | Email | Password |
|------|-------|----------|
| Citizen | `citizen@demo.local` | `Demo@User123` |
| Operator | `operator@demo.local` | `Demo@Operator123` |
| Admin | `admin@demo.local` | `Demo@Admin123` |

> Throwaway demo credentials for local development only.

## Project structure
```
frontend/
  app/            # App Router: /, /login, /user/*, /operator/*, /admin/*, /api/*
  components/     # LiveMap, RoleShell, ModeToggle, ChatUI, ...
  lib/
    supabase/     # browser + server + middleware Supabase clients
    auth.ts       # server-side current-user/role resolution
    mode.ts       # SIMULATION/LIVE data-mode helpers
    server/       # Kerala pincodes + in-memory report store (simulation)
  middleware.ts   # Supabase-session role-based route protection
backend/
  app/            # FastAPI: config, services (supabase/telemetry/relay/mqtt-sim), api, ws
  scripts/        # seed_users.py
supabase/
  migrations/     # schema + RLS + storage (run in order)
  seed/           # pincodes + demo devices
```


## Tech
Next.js · React · TypeScript · Tailwind CSS · Leaflet / react-leaflet · Recharts (planned).

## Data & safety notes
- Electricity status, node telemetry, faults, maintenance and analytics are **simulated demo data**, clearly labeled in the UI.
- Fault position is an **estimated segment**, not an exact physical distance.
- Estimated restoration times are labeled as estimates.
- Status is never communicated by colour alone.
