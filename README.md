# LT-FaultX

**Smart Low-Tension (LT) Electrical Line Fault Detection, Localization, Isolation & Public Monitoring platform.**

> ⚠️ Hackathon prototype. Not certified for real electrical distribution deployment. All field/telemetry data shown is **simulated** unless explicitly stated. Never connect prototype hardware to a live 230V/415V line.

Detect → Localize → Isolate → Alert → Monitor → Verify → Restore, across a distributed set of LT monitoring nodes, with a live Kerala map, citizen reporting, maintenance management, and role-based dashboards.

## Current status
This repository currently contains the **Next.js frontend** with a mock API layer. The dedicated FastAPI backend, MQTT/ESP32 simulator, real fault engine, WebSocket, and notifications are planned (see roadmap).

### Implemented
- Green/black control-room UI (Next.js 15 · React 19 · TypeScript · Tailwind)
- Role-based access — **Citizen / Operator / Admin** — with route guards
- Interactive **Kerala map** (Leaflet + OpenStreetMap/CARTO): masked to Kerala, heat-style density of all 1,418 Kerala pincodes, LT nodes, line + estimated fault segment, fault radius, operators, citizen-report markers, fullscreen expand with global context
- **Pincode lookup** — real locality resolution (India Post API) + coordinates (GeoNames)
- **Citizen outage reporting** that persists and appears live on the map
- Maintenance **SLA countdown timers**, analytics, audit log, configuration, AI assistant shells

### Roadmap (not yet built)
FastAPI backend · PostgreSQL · MQTT + ESP32 simulator · fault detection/localization engine · WebSocket live updates · NotificationService (SMS/call/email mocks) · Docker Compose · tests.

## Getting started
```bash
cd frontend
npm install
npm run dev        # http://localhost:3000  (or: npx next dev -p 3001)
```

### Demo accounts (development only)
| Role | Email | Password |
|------|-------|----------|
| Citizen | `user@demo.local` | `Demo@User123` |
| Operator | `operator@demo.local` | `Demo@Operator123` |
| Admin | `admin@demo.local` | `Demo@Admin123` |

> These are throwaway demo credentials for local development. Do not use in production; they will be replaced by hashed passwords + JWT when the backend lands.

## Project structure
```
frontend/
  app/            # App Router pages: /, /login, /user/*, /operator/*, /admin/*, /api/*
  components/     # LiveMap, RoleShell, ChatUI, MaintenanceTimer, ArchitectureFlow, ui
  lib/            # demo data, session, kerala geometry
    server/       # server-only data (Kerala pincodes) + in-memory report store
  middleware.ts   # role-based route protection
```

## Tech
Next.js · React · TypeScript · Tailwind CSS · Leaflet / react-leaflet · Recharts (planned).

## Data & safety notes
- Electricity status, node telemetry, faults, maintenance and analytics are **simulated demo data**, clearly labeled in the UI.
- Fault position is an **estimated segment**, not an exact physical distance.
- Estimated restoration times are labeled as estimates.
- Status is never communicated by colour alone.
