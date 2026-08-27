-- 0006_audit_firmware.sql
-- Audit trail, firmware versions, and firmware deployments.

-- ---------------------------------------------------------------------------
-- audit_logs: append-only record of privileged/security-relevant actions.
-- Written by the backend (service role). Readable by admins.
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles (id) on delete set null,
  actor_role  public.user_role,
  action      text not null,                          -- e.g. 'relay.command', 'config.update'
  entity_type text,                                   -- e.g. 'device', 'firmware'
  entity_id   text,
  detail      jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action);

-- ---------------------------------------------------------------------------
-- firmware_versions: uploaded firmware binaries (stored in the 'firmware'
-- storage bucket). Metadata + checksum + compatibility.
-- ---------------------------------------------------------------------------
create table if not exists public.firmware_versions (
  id             uuid primary key default gen_random_uuid(),
  version        text not null unique,
  filename       text not null,
  storage_path   text not null,                       -- path inside 'firmware' bucket
  checksum       text not null,                       -- e.g. sha256 hex
  compatibility  text,                                -- device model/family
  notes          text,
  uploaded_by    uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- firmware_deployments: which firmware went to which device and its outcome.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'deployment_status') then
    create type public.deployment_status as enum
      ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'ROLLED_BACK');
  end if;
end$$;

create table if not exists public.firmware_deployments (
  id           uuid primary key default gen_random_uuid(),
  firmware_id  uuid not null references public.firmware_versions (id) on delete cascade,
  device_id    uuid not null references public.devices (id) on delete cascade,
  method       text not null default 'OTA',           -- OTA | USB
  status       public.deployment_status not null default 'PENDING',
  deployed_by  uuid references public.profiles (id) on delete set null,
  started_at   timestamptz,
  finished_at  timestamptz,
  error        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists firmware_deployments_device_idx on public.firmware_deployments (device_id);

drop trigger if exists firmware_deployments_set_updated_at on public.firmware_deployments;
create trigger firmware_deployments_set_updated_at
  before update on public.firmware_deployments
  for each row execute function public.set_updated_at();
