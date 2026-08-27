-- 0003_telemetry_faults.sql
-- Time-series telemetry and detected fault events.

-- ---------------------------------------------------------------------------
-- telemetry: validated readings inserted by the FastAPI backend only.
-- Matches the ESP32 payload described in the spec.
-- ---------------------------------------------------------------------------
create table if not exists public.telemetry (
  id          uuid primary key default gen_random_uuid(),
  device_id   uuid not null references public.devices (id) on delete cascade,
  reading_at  timestamptz not null default now(),   -- timestamp from device/backend
  voltage     double precision,
  current     double precision,
  power       double precision,
  relay_k1    boolean,
  relay_k2    boolean,
  fault       boolean not null default false,
  line_status text,                                  -- HEALTHY | ...
  wifi_rssi   integer,
  created_at  timestamptz not null default now()
);

-- Fast "latest N readings for a device" and time-window queries.
create index if not exists telemetry_device_time_idx
  on public.telemetry (device_id, reading_at desc);

-- ---------------------------------------------------------------------------
-- fault_events: fault engine output. "Estimated segment" only — never claims
-- exact fault coordinates.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'fault_status') then
    create type public.fault_status as enum
      ('ACTIVE', 'ACKNOWLEDGED', 'ISOLATED', 'RESTORED', 'CLOSED');
  end if;
  if not exists (select 1 from pg_type where typname = 'fault_severity') then
    create type public.fault_severity as enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
  end if;
end$$;

create table if not exists public.fault_events (
  id                uuid primary key default gen_random_uuid(),
  device_id         uuid references public.devices (id) on delete set null,
  fault_type        text not null,
  severity          public.fault_severity not null default 'MEDIUM',
  voltage           double precision,
  current           double precision,
  detected_at       timestamptz not null default now(),
  cleared_at        timestamptz,
  status            public.fault_status not null default 'ACTIVE',
  confidence        double precision,                -- 0..1
  estimated_segment text,                            -- e.g. "NODE_03 -> NODE_04"
  acknowledged_by   uuid references public.profiles (id) on delete set null,
  acknowledged_at   timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists fault_events_device_idx on public.fault_events (device_id);
create index if not exists fault_events_status_idx on public.fault_events (status);
create index if not exists fault_events_detected_idx on public.fault_events (detected_at desc);

drop trigger if exists fault_events_set_updated_at on public.fault_events;
create trigger fault_events_set_updated_at
  before update on public.fault_events
  for each row execute function public.set_updated_at();
