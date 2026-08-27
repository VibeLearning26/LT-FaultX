-- set_roles.sql
-- Assigns roles to the three demo users AFTER they have been created in
-- Supabase Authentication (Dashboard -> Authentication -> Users).
--
-- HOW TO RUN:
--   Supabase Dashboard -> SQL Editor -> New query -> paste this file -> Run.
--
-- You do NOT need to re-run the migration files. This only updates roles.

update public.profiles set role = 'admin',    full_name = 'Demo Administrator' where email = 'admin@demo.local';
update public.profiles set role = 'operator', full_name = 'Demo Operator'      where email = 'operator@demo.local';
update public.profiles set role = 'citizen',  full_name = 'Demo Citizen'       where email = 'citizen@demo.local';

-- Verify (should show admin / operator / citizen):
select email, role, full_name from public.profiles order by email;
