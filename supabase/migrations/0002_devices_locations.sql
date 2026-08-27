-- 0002_devices_locations.sql
-- Core device registry, physical/logical locations, operator locations,
-- and the Kerala pincode lookup table (seeded from kerala-pins.json).

-- ---------------------------------------------------------------------------
-- pincode_locations: authoritative Kerala pincode -> locality/district/geo.
-- Mirrors frontend/lib/server/kerala-pins.json. Public read.
-- ---------------------------------------------------------------------------
create table if not exists public.pincode_locations (
  pincode    text primary key,
  office     text not null,
  district   text not null,
  latitude   double precision not null,
  longitude  double precision not null,
  created_at timestamptz not null default now()
);

create index if not exists pincode_locations_district_idx on public.pincode_locations (district);

-- ---------------------------------------------------------------------------
-- devices: one row per physical LT node (e.g. LT_NODE_01).
-- ---------------------------------------------------------------------------
create table if not exists public.devices (
  id              uuid primary key default gen_random_uuid(),
  device_id       text not null unique,          -- human/hardware id, e.g. LT_NODE_01
  name            text,
  sequence        integer,                        -- position along the feeder
  firmware_version text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists devices_device_id_idx on public.devices (device_id);

drop trigger if exists devices_set_updated_at on public.devices;
create trigger devices_set_updated_at
  before update on public.devices
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- device_locations: location assigned to a device via pincode (no GPS module).
-- Latitude/longitude are resolved from pincode data, not invented.
-- ---------------------------------------------------------------------------
create table if not exists public.device_locations (
  id          uuid primary key default gen_random_uuid(),
  device_id   uuid not null references public.devices (id) on delete cascade,
  pincode     text not null references public.pincode_locations (pincode),
  locality    text not null,
  district    text not null,
  latitude    double precision not null,
  longitude   double precision not null,
  assigned_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (device_id)                              -- one active location per device
);

create index if not exists device_locations_pincode_idx on public.device_locations (pincode);

drop trigger if exists device_locations_set_updated_at on public.device_locations;
create trigger device_locations_set_updated_at
  before update on public.device_locations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- operator_locations: field operator positions / availability.
-- ---------------------------------------------------------------------------
create table if not exists public.operator_locations (
  id           uuid primary key default gen_random_uuid(),
  operator_id  uuid references public.profiles (id) on delete set null,
  label        text not null,                     -- e.g. "Field Operator 01"
  latitude     double precision not null,
  longitude    double precision not null,
  availability text not null default 'AVAILABLE', -- AVAILABLE | BUSY
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

drop trigger if exists operator_locations_set_updated_at on public.operator_locations;
create trigger operator_locations_set_updated_at
  before update on public.operator_locations
  for each row execute function public.set_updated_at();
