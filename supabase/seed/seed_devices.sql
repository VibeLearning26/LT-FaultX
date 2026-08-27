-- seed_devices.sql
-- Seeds the 5 demo LT nodes + their locations + live status snapshot + default
-- configuration, matching frontend/lib/demo-data.ts (NODES / MONITORED_PINCODES).
--
-- Run AFTER seed_pincodes.sql (device_locations FK -> pincode_locations).
-- The monitored pincodes below (682001/682002/682016/682019/682020) are Ernakulam
-- localities; they are inserted into pincode_locations here in case the generated
-- Kerala dataset does not already contain them.

-- Ensure monitored pincodes exist (idempotent).
insert into public.pincode_locations (pincode, office, district, latitude, longitude) values
  ('682001', 'Fort Kochi',       'Ernakulam', 9.965,  76.2424),
  ('682002', 'Mattancherry',     'Ernakulam', 9.958,  76.259),
  ('682016', 'Ernakulam South',  'Ernakulam', 9.967,  76.287),
  ('682019', 'Vyttila',          'Ernakulam', 9.968,  76.318),
  ('682020', 'Kadavanthra',      'Ernakulam', 9.967,  76.301)
on conflict (pincode) do nothing;

-- Devices (stable device_id). gen_random_uuid() for internal id.
insert into public.devices (device_id, name, sequence, firmware_version, is_active) values
  ('NODE_01', 'Fort Kochi Node',      1, 'v0.1.0', true),
  ('NODE_02', 'Mattancherry Node',    2, 'v0.1.0', true),
  ('NODE_03', 'Ernakulam South Node', 3, 'v0.1.0', true),
  ('NODE_04', 'Kadavanthra Node',     4, 'v0.1.0', true),
  ('NODE_05', 'Vyttila Node',         5, 'v0.1.0', true)
on conflict (device_id) do nothing;

-- Device locations (resolved from pincode data; no invented GPS).
insert into public.device_locations (device_id, pincode, locality, district, latitude, longitude)
select d.id, v.pincode, v.locality, v.district, v.latitude, v.longitude
from (values
  ('NODE_01', '682001', 'Fort Kochi',      'Ernakulam', 9.965, 76.2424),
  ('NODE_02', '682002', 'Mattancherry',    'Ernakulam', 9.958, 76.259),
  ('NODE_03', '682016', 'Ernakulam South', 'Ernakulam', 9.967, 76.287),
  ('NODE_04', '682020', 'Kadavanthra',     'Ernakulam', 9.967, 76.301),
  ('NODE_05', '682019', 'Vyttila',         'Ernakulam', 9.968, 76.318)
) as v(device_id, pincode, locality, district, latitude, longitude)
join public.devices d on d.device_id = v.device_id
on conflict (device_id) do nothing;

-- Live status snapshot (matches demo NODES: 01-03 online, 04-05 offline).
insert into public.device_status
  (device_id, online, heartbeat_ok, comm, mqtt_connected, firmware_version, last_seen)
select d.id, v.online, v.heartbeat_ok, v.comm, false, 'v0.1.0', now()
from (values
  ('NODE_01', true,  true,  'OK'),
  ('NODE_02', true,  true,  'OK'),
  ('NODE_03', true,  true,  'OK'),
  ('NODE_04', false, false, 'LOST'),
  ('NODE_05', false, false, 'LOST')
) as v(device_id, online, heartbeat_ok, comm)
join public.devices d on d.device_id = v.device_id
on conflict (device_id) do nothing;

-- Default configuration for each device.
insert into public.device_configuration (
  device_id, current_zero_offset, current_sensitivity, voltage_calibration,
  voltage_fault_threshold, current_warning_threshold, fault_debounce_ms,
  telemetry_interval_ms, auto_isolation_enabled, buzzer_enabled, demo_mode
)
select d.id, 2.5, 0.066, 1.0, 180.0, 5.0, 500, 2000, true, true, true
from public.devices d
on conflict (device_id) do nothing;
