-- 0005_reports_maintenance_notifications.sql
-- Citizen outage reports, maintenance records, and notifications.

-- ---------------------------------------------------------------------------
-- outage_reports: citizen-submitted. Mirrors the frontend OutageReport shape
-- (pincode/locality/electricity/description + resolved geo) plus a reporter FK.
-- reporter_id is null for anonymous submissions.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'electricity_state') then
    create type public.electricity_state as enum ('YES', 'NO', 'PARTIAL');
  end if;
end$$;

create table if not exists public.outage_reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid references public.profiles (id) on delete set null,
  pincode      text not null,
  locality     text not null,
  electricity  public.electricity_state not null default 'NO',
  description  text default '',
  latitude     double precision,
  longitude    double precision,
  district     text,
  created_at   timestamptz not null default now()
);

create index if not exists outage_reports_reporter_idx on public.outage_reports (reporter_id);
create index if not exists outage_reports_created_idx on public.outage_reports (created_at desc);
create index if not exists outage_reports_pincode_idx on public.outage_reports (pincode);

-- ---------------------------------------------------------------------------
-- maintenance_records: jobs dispatched against faults.
-- ---------------------------------------------------------------------------
create table if not exists public.maintenance_records (
  id          uuid primary key default gen_random_uuid(),
  fault_id    uuid references public.fault_events (id) on delete set null,
  device_id   uuid references public.devices (id) on delete set null,
  operator_id uuid references public.profiles (id) on delete set null,
  location    text,
  fault_type  text,
  priority    text not null default 'MEDIUM',        -- LOW | MEDIUM | HIGH
  status      text not null default 'OPEN',          -- OPEN | IN_PROGRESS | DONE | CANCELLED
  deadline_at timestamptz,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists maintenance_records_status_idx on public.maintenance_records (status);
create index if not exists maintenance_records_operator_idx on public.maintenance_records (operator_id);

drop trigger if exists maintenance_records_set_updated_at on public.maintenance_records;
create trigger maintenance_records_set_updated_at
  before update on public.maintenance_records
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- notifications: per-user database-driven notifications.
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles (id) on delete cascade,
  title       text not null,
  body        text,
  kind        text default 'info',                   -- info | fault | maint | ...
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
