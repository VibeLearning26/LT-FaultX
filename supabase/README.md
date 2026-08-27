# Supabase Setup — LT-FaultX

This directory holds the SQL you run against the **existing** Supabase project
(`https://sdfhhqyxuubcdmqjznor.supabase.co`). No new project is created.

## What's here

```
migrations/   Schema, RLS policies, storage bucket — run in numeric order
seed/         Reference + demo data — run after migrations
```

## 1. Apply migrations (in order)

Open the Supabase Dashboard → **SQL Editor**, then paste and run each file in
order:

1. `migrations/0001_profiles.sql` — extensions, role enum, `profiles`, signup trigger, RLS helpers
2. `migrations/0002_devices_locations.sql` — `devices`, `device_locations`, `operator_locations`, `pincode_locations`
3. `migrations/0003_telemetry_faults.sql` — `telemetry`, `fault_events`
4. `migrations/0004_relay_status_config.sql` — `relay_commands`, `device_status`, `device_configuration`
5. `migrations/0005_reports_maintenance_notifications.sql` — `outage_reports`, `maintenance_records`, `notifications`
6. `migrations/0006_audit_firmware.sql` — `audit_logs`, `firmware_versions`, `firmware_deployments`
7. `migrations/0007_rls_policies.sql` — enables RLS + all role policies
8. `migrations/0008_storage_firmware.sql` — `firmware` storage bucket + admin-only policies

> Migrations are written to be re-runnable (`create ... if not exists`,
> `on conflict do nothing`, `drop policy if exists` before create).

If you prefer the CLI:

```bash
supabase link --project-ref sdfhhqyxuubcdmqjznor
# then run each file, e.g.:
psql "$SUPABASE_DB_URL" -f migrations/0001_profiles.sql
```

## 2. Seed data (after migrations)

1. `seed/seed_pincodes.sql` — 1,418 Kerala pincodes → `pincode_locations`
   (generated from `frontend/lib/server/kerala-pins.json`).
2. `seed/seed_devices.sql` — the 5 demo nodes + locations + status + config.

## 3. Create the demo auth users

RLS roles come from `profiles.role`, which is auto-populated from the auth
user's metadata by the `on_auth_user_created` trigger. Create the three demo
users via the backend script (uses the service-role key):

```bash
cd ../backend
python scripts/seed_users.py
```

This creates:

| Email                 | Password           | Role     |
|-----------------------|--------------------|----------|
| citizen@demo.local    | Demo@User123       | citizen  |
| operator@demo.local   | Demo@Operator123   | operator |
| admin@demo.local      | Demo@Admin123      | admin    |

Alternatively, create users in Dashboard → Authentication → Users, then set
`raw_user_meta_data` to `{"role":"operator","full_name":"..."}` (or update the
`profiles.role` column directly).

## Role model

`profiles.role` is an enum: `citizen | operator | admin`.

- **citizen** — read public device/pincode status, create + read own outage reports, read own profile.
- **operator** — read devices/telemetry/faults, acknowledge faults, view reports, (relay control mediated by backend).
- **admin** — manage devices/config/users/firmware, read audit logs.

The **backend service-role key bypasses RLS** and is the only writer for
telemetry, relay ACKs, device status, and audit logs.
