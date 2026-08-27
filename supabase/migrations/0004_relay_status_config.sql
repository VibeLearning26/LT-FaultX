-- 0004_relay_status_config.sql
-- Relay command lifecycle, live device status, and per-device configuration.

-- ---------------------------------------------------------------------------
-- relay_commands: full request -> ACK lifecycle. The frontend must NOT show
-- "Relay OFF successful" until status = 'ACKED'.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'relay_command_status') then
    create type public.relay_command_status as enum
      ('PENDING', 'SENT', 'ACKED', 'FAILED', 'TIMEOUT');
  end if;
end$$;

create table if not exists public.relay_commands (
  id            uuid primary key default gen_random_uuid(),
  device_id     uuid not null references public.devices (id) on delete cascade,
  relay         text not null,                       -- e.g. 'k1' | 'k2'
  desired_state boolean not null,                    -- true = ON, false = OFF
  status        public.relay_command_status not null default 'PENDING',
  issued_by     uuid references public.profiles (id) on delete set null,
  issued_at     timestamptz not null default now(),
  sent_at       timestamptz,
  acked_at      timestamptz,
  ack_state     boolean,                             -- state reported by ESP32 ACK
  error         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists relay_commands_device_idx on public.relay_commands (device_id, issued_at desc);
create index if not exists relay_commands_status_idx on public.relay_commands (status);

drop trigger if exists relay_commands_set_updated_at on public.relay_commands;
create trigger relay_commands_set_updated_at
  before update on public.relay_commands
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- device_status: latest live snapshot per device (one row per device).
-- ---------------------------------------------------------------------------
create table if not exists public.device_status (
  device_id        uuid primary key references public.devices (id) on delete cascade,
  online           boolean not null default false,
  heartbeat_ok     boolean not null default false,
  last_heartbeat   timestamptz,
  last_seen        timestamptz,
  comm             text default 'UNKNOWN',           -- OK | DEGRADED | LOST
  mqtt_connected   boolean not null default false,
  firmware_version text,
  wifi_rssi        integer,
  updated_at       timestamptz not null default now()
);

drop trigger if exists device_status_set_updated_at on public.device_status;
create trigger device_status_set_updated_at
  before update on public.device_status
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- device_configuration: calibration + thresholds pushed to the ESP32.
-- One row per device. ESP32 acknowledges via acked_at/config_acked.
-- ---------------------------------------------------------------------------
create table if not exists public.device_configuration (
  device_id                uuid primary key references public.devices (id) on delete cascade,
  current_zero_offset      double precision,
  current_sensitivity      double precision,
  voltage_calibration      double precision,
  voltage_fault_threshold  double precision,
  current_warning_threshold double precision,
  fault_debounce_ms        integer,
  telemetry_interval_ms    integer,
  auto_isolation_enabled   boolean not null default true,
  buzzer_enabled           boolean not null default true,
  demo_mode                boolean not null default false,
  config_acked             boolean not null default false,
  updated_by               uuid references public.profiles (id) on delete set null,
  acked_at                 timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

drop trigger if exists device_configuration_set_updated_at on public.device_configuration;
create trigger device_configuration_set_updated_at
  before update on public.device_configuration
  for each row execute function public.set_updated_at();
