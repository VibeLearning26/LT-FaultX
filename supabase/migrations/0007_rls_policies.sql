-- 0007_rls_policies.sql
-- Enable Row Level Security on every application table and define role-based
-- policies. The backend uses the service-role key, which bypasses RLS entirely,
-- so these policies govern only browser (anon/authenticated) access.
--
-- Roles come from public.profiles.role via the helpers in 0001:
--   current_role(), is_admin(), is_operator_or_admin()

-- ===========================================================================
-- profiles
-- ===========================================================================
alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_role()); -- cannot self-escalate role

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ===========================================================================
-- pincode_locations: public reference data (read for everyone incl. anon).
-- ===========================================================================
alter table public.pincode_locations enable row level security;

drop policy if exists pincode_locations_read on public.pincode_locations;
create policy pincode_locations_read on public.pincode_locations
  for select using (true);

drop policy if exists pincode_locations_admin_write on public.pincode_locations;
create policy pincode_locations_admin_write on public.pincode_locations
  for all using (public.is_admin()) with check (public.is_admin());

-- ===========================================================================
-- devices / device_locations / device_status: public/authenticated read of
-- status; admin manages devices.
-- ===========================================================================
alter table public.devices enable row level security;

drop policy if exists devices_read on public.devices;
create policy devices_read on public.devices
  for select using (true);

drop policy if exists devices_admin_write on public.devices;
create policy devices_admin_write on public.devices
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.device_locations enable row level security;

drop policy if exists device_locations_read on public.device_locations;
create policy device_locations_read on public.device_locations
  for select using (true);

drop policy if exists device_locations_admin_write on public.device_locations;
create policy device_locations_admin_write on public.device_locations
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.device_status enable row level security;

drop policy if exists device_status_read on public.device_status;
create policy device_status_read on public.device_status
  for select using (true);

-- No browser writes: device_status is written by the backend (service role).

alter table public.operator_locations enable row level security;

drop policy if exists operator_locations_read on public.operator_locations;
create policy operator_locations_read on public.operator_locations
  for select using (public.is_operator_or_admin());

drop policy if exists operator_locations_write on public.operator_locations;
create policy operator_locations_write on public.operator_locations
  for all using (public.is_operator_or_admin()) with check (public.is_operator_or_admin());

-- ===========================================================================
-- telemetry: operators/admins read. Writes are backend-only (service role).
-- ===========================================================================
alter table public.telemetry enable row level security;

drop policy if exists telemetry_read on public.telemetry;
create policy telemetry_read on public.telemetry
  for select using (public.is_operator_or_admin());

-- ===========================================================================
-- fault_events: operators/admins read; operators may acknowledge (update).
-- Inserts are backend-only (fault engine via service role).
-- ===========================================================================
alter table public.fault_events enable row level security;

drop policy if exists fault_events_read on public.fault_events;
create policy fault_events_read on public.fault_events
  for select using (public.is_operator_or_admin());

drop policy if exists fault_events_ack on public.fault_events;
create policy fault_events_ack on public.fault_events
  for update using (public.is_operator_or_admin())
  with check (public.is_operator_or_admin());

-- ===========================================================================
-- relay_commands: operators/admins read; issuing goes through the backend
-- (service role) so the ACK lifecycle is authoritative.
-- ===========================================================================
alter table public.relay_commands enable row level security;

drop policy if exists relay_commands_read on public.relay_commands;
create policy relay_commands_read on public.relay_commands
  for select using (public.is_operator_or_admin());

-- ===========================================================================
-- device_configuration: operators/admins read; admins may edit directly
-- (backend still mediates the push+ACK to the ESP32).
-- ===========================================================================
alter table public.device_configuration enable row level security;

drop policy if exists device_configuration_read on public.device_configuration;
create policy device_configuration_read on public.device_configuration
  for select using (public.is_operator_or_admin());

drop policy if exists device_configuration_admin_write on public.device_configuration;
create policy device_configuration_admin_write on public.device_configuration
  for all using (public.is_admin()) with check (public.is_admin());

-- ===========================================================================
-- outage_reports: citizens create + read their own; operators/admins read all.
-- ===========================================================================
alter table public.outage_reports enable row level security;

drop policy if exists outage_reports_insert_own on public.outage_reports;
create policy outage_reports_insert_own on public.outage_reports
  for insert with check (reporter_id = auth.uid());

drop policy if exists outage_reports_select_own on public.outage_reports;
create policy outage_reports_select_own on public.outage_reports
  for select using (reporter_id = auth.uid() or public.is_operator_or_admin());

-- ===========================================================================
-- maintenance_records: operators/admins read + manage.
-- ===========================================================================
alter table public.maintenance_records enable row level security;

drop policy if exists maintenance_read on public.maintenance_records;
create policy maintenance_read on public.maintenance_records
  for select using (public.is_operator_or_admin());

drop policy if exists maintenance_write on public.maintenance_records;
create policy maintenance_write on public.maintenance_records
  for all using (public.is_operator_or_admin()) with check (public.is_operator_or_admin());

-- ===========================================================================
-- notifications: each user reads/updates their own.
-- ===========================================================================
alter table public.notifications enable row level security;

drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===========================================================================
-- audit_logs: admin read only. Writes are backend-only (service role).
-- ===========================================================================
alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_admin_read on public.audit_logs;
create policy audit_logs_admin_read on public.audit_logs
  for select using (public.is_admin());

-- ===========================================================================
-- firmware_versions / firmware_deployments: admin only (uploads/deploys are
-- mediated by the backend; browser access is admin-read/manage).
-- ===========================================================================
alter table public.firmware_versions enable row level security;

drop policy if exists firmware_versions_admin on public.firmware_versions;
create policy firmware_versions_admin on public.firmware_versions
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.firmware_deployments enable row level security;

drop policy if exists firmware_deployments_admin on public.firmware_deployments;
create policy firmware_deployments_admin on public.firmware_deployments
  for all using (public.is_admin()) with check (public.is_admin());
