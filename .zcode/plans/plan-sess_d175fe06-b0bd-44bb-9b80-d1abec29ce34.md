# LT-FaultX → Supabase + FastAPI Migration (Pass 1: Foundation + Backend)

Scope: schema/RLS/auth/clients/seed + SIMULATION↔LIVE toggle + working FastAPI backend. Migrations delivered as **SQL files you run yourself**. MQTT/ESP32 stay simulated.

## Keys
- **Frontend (publishable):** `sb_publishable_0YWgUzBJR2zFtGESXW390w_R79SV3nh` → goes in gitignored `frontend/.env.local`.
- **Backend (service-role secret):** the value you gave is a duplicate of the publishable key and is NOT a service-role secret. I'll put a marked placeholder in `backend/.env`; you replace it with the real `sb_secret_...` / `service_role` JWT. Never committed, never sent to the browser. Backend live paths stay stubbed until it's provided.

## 1. Supabase schema — `supabase/migrations/*.sql` (run in order)
UUID PKs, FKs, indexes, `created_at/updated_at` + `updated_at` trigger.
- `0001` pgcrypto, `role` enum (`citizen|operator|admin`), `profiles` (FK→`auth.users`), auto-create-profile-on-signup trigger.
- `0002` `devices`, `device_locations`, `operator_locations`, `pincode_locations`.
- `0003` `telemetry` (indexed by device+time), `fault_events` (severity, confidence, estimated_segment, status).
- `0004` `relay_commands` (request→ACK lifecycle), `device_status`, `device_configuration` (all calibration/threshold fields).
- `0005` `outage_reports` (matches current shape + reporter FK), `maintenance_records`, `notifications`.
- `0006` `audit_logs`, `firmware_versions`, `firmware_deployments`.
- `0007` RLS enabled on all tables + citizen/operator/admin policies (service-role bypasses).
- `0008` `firmware` storage bucket + admin-only storage policies.

## 2. Seed — `supabase/seed/*.sql` (generated)
`seed_pincodes.sql` (from `kerala-pins.json`), `seed_devices.sql` (5 demo NODES + locations/status from `demo-data.ts`), plus a `README.md` with run order + demo-user creation.

## 3. FastAPI backend — new `backend/`
- `app/config.py` (pydantic-settings; service-role key server-only), `services/supabase_service.py`, `services/telemetry.py` (Pydantic validation of the spec's telemetry payload before insert), `services/mqtt_client.py` (**simulated** broker interface).
- Routes: `/health`, `/telemetry` (validate→insert), `/relay` (command→pending→ACK→`relay_commands`+`audit_logs`; never reports success before ACK), `/config`, `/devices`.
- `ws/` WebSocket `/ws/telemetry` broadcasting telemetry/faults/relay-acks (primary hardware realtime path).
- `scripts/seed_users.py` (creates 3 demo auth users via service role).
- `requirements.txt`, `.env.example`, `.env` (placeholder secret), `README.md`. Docker optional.

## 4. Frontend
- Add `@supabase/supabase-js`, `@supabase/ssr`.
- `lib/supabase/client.ts` (browser, publishable key) + `lib/supabase/server.ts` (cookies).
- **Auth:** replace base64 login → `signInWithPassword`; `middleware.ts` → Supabase session + role from `profiles`; logout → `signOut`. Role standardized to `citizen|operator|admin` with a compat map. Old `session.ts`/`demo-users.ts` kept but unwired.
- **SIMULATION↔LIVE toggle:** `lib/mode.ts` (cookie/localStorage, default SIMULATION) + data-access layer routing reads to demo-data/mock routes (sim) or Supabase/FastAPI+WebSocket (live). Existing mock routes stay intact so sim needs no backend. Toggle control in the admin shell.
- **Outage reports (live):** Supabase-backed under RLS; sim keeps in-memory store. Reuses existing pincode resolution.
- `frontend/.env.local.example` with `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` only.

## 5. Verify
- Frontend: `npm install` + `npm run build` (typecheck passes; sim mode fully works without keys).
- Backend: venv + `pip install -r requirements.txt` + health check. Live paths documented as needing the real service-role secret.

## Out of scope this pass (stubbed for clean drop-in later)
Real MQTT broker, ESP32 firmware/OTA/USB flashing, full Developer Console UI, Supabase Realtime for reports.

## From you at implementation time
Real `sb_secret_...` service-role key; run the SQL migrations/seeds in the Supabase SQL editor; then run `backend/scripts/seed_users.py`.