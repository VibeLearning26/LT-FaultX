/**
 * Shared SIMULATED demo data for the frontend shell.
 * Replaced by live backend/API data (FastAPI + MQTT telemetry) in later phases.
 */
import type { StatusKind } from "@/components/ui";

export interface NodeRow {
  id: string;
  locality: string;
  pincode: string;
  sequence: number;
  status: "ONLINE" | "STALE" | "OFFLINE";
  voltage: number | null;
  current: number | null;
  heartbeat: "OK" | "MISSING";
  lastSeen: string;
  comm: "OK" | "DEGRADED" | "LOST";
  health: StatusKind;
  lat: number;
  lng: number;
}

export const NODES: NodeRow[] = [
  { id: "NODE_01", locality: "Fort Kochi", pincode: "682001", sequence: 1, status: "ONLINE", voltage: 230, current: 2.4, heartbeat: "OK", lastSeen: "5s ago", comm: "OK", health: "normal", lat: 9.965, lng: 76.2424 },
  { id: "NODE_02", locality: "Mattancherry", pincode: "682002", sequence: 2, status: "ONLINE", voltage: 229, current: 2.1, heartbeat: "OK", lastSeen: "4s ago", comm: "OK", health: "normal", lat: 9.958, lng: 76.259 },
  { id: "NODE_03", locality: "Ernakulam South", pincode: "682016", sequence: 3, status: "ONLINE", voltage: 231, current: 2.2, heartbeat: "OK", lastSeen: "3s ago", comm: "OK", health: "normal", lat: 9.967, lng: 76.287 },
  { id: "NODE_04", locality: "Kadavanthra", pincode: "682020", sequence: 4, status: "OFFLINE", voltage: null, current: null, heartbeat: "MISSING", lastSeen: "2m ago", comm: "LOST", health: "fault", lat: 9.967, lng: 76.301 },
  { id: "NODE_05", locality: "Vyttila", pincode: "682019", sequence: 5, status: "OFFLINE", voltage: null, current: null, heartbeat: "MISSING", lastSeen: "2m ago", comm: "LOST", health: "fault", lat: 9.968, lng: 76.318 },
];

/** Kerala geographic centre for initial map view. */
export const KERALA_CENTER: [number, number] = [10.8505, 76.2711];

/**
 * Bounding box that keeps the map locked to Kerala (SW corner, NE corner).
 * Panning is clamped to these bounds and zoom-out is limited so the rest of
 * the world is never shown.
 */
export const KERALA_BOUNDS: [[number, number], [number, number]] = [
  [8.05, 74.75], // south-west
  [12.85, 77.5], // north-east
];

/** LT line geometry (ordered GPS coordinates) for the demo feeder. */
export const LINE_COORDS: [number, number][] = NODES.map((n) => [n.lat, n.lng]);

export interface OperatorGeo {
  id: string;
  name: string;
  lat: number;
  lng: number;
  availability: "AVAILABLE" | "BUSY";
}

export const OPERATORS_GEO: OperatorGeo[] = [
  { id: "OP-01", name: "Field Operator 01", lat: 9.9705, lng: 76.295, availability: "AVAILABLE" },
  { id: "OP-02", name: "Field Operator 02", lat: 9.962, lng: 76.31, availability: "BUSY" },
];

/** Active fault geo point with configurable affected radius (metres). */
export const FAULT_GEO = {
  faultId: "FT-00031",
  nodeId: "NODE_04",
  lat: 9.967,
  lng: 76.301,
  faultType: "Broken / open conductor (suspected)",
  current: 0,
  voltage: 0,
  affectedRadiusM: 500,
  detectedAt: "10:42 AM",
};

export interface FaultRow {
  id: string;
  type: string;
  status: "ACTIVE" | "ACKNOWLEDGED" | "ISOLATED" | "RESTORED" | "CLOSED";
  detectedAt: string;
  segment: string;
  location: string;
  lastHealthy: string;
  firstFailed: string;
  isolation: "CONNECTED" | "ISOLATED" | "UNKNOWN";
  maintenance: string;
}

export const FAULTS: FaultRow[] = [
  {
    id: "FT-00031",
    type: "BROKEN / OPEN CONDUCTOR (suspected)",
    status: "ACTIVE",
    detectedAt: "10:42 AM",
    segment: "NODE_03 → NODE_04",
    location: "Kadavanthra (682020)",
    lastHealthy: "NODE_03",
    firstFailed: "NODE_04",
    isolation: "CONNECTED",
    maintenance: "Not assigned",
  },
];

export interface MaintenanceJob {
  id: string;
  faultId: string;
  location: string;
  faultType: string;
  operator: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  createdAt: string;
  deadlineInMin: number;
  status: string;
}

export const MAINTENANCE: MaintenanceJob[] = [
  {
    id: "MJ-0012",
    faultId: "FT-00031",
    location: "Kadavanthra (682020)",
    faultType: "Broken conductor (suspected)",
    operator: "Demo Operator",
    priority: "HIGH",
    createdAt: "10:44 AM",
    deadlineInMin: 45,
    status: "IN_PROGRESS",
  },
  {
    id: "MJ-0011",
    faultId: "FT-00029",
    location: "Vyttila (682019)",
    faultType: "Communication failure",
    operator: "Demo Operator",
    priority: "MEDIUM",
    createdAt: "09:10 AM",
    deadlineInMin: 10,
    status: "IN_PROGRESS",
  },
];

export interface AlertRow {
  id: string;
  kind: StatusKind;
  title: string;
  detail: string;
  time: string;
}

export const ALERTS: AlertRow[] = [
  { id: "AL-1", kind: "fault", title: "Fault detected — FT-00031", detail: "Abnormal distributed pattern near NODE_03 → NODE_04.", time: "10:42 AM" },
  { id: "AL-2", kind: "maint", title: "Maintenance SLA warning — MJ-0011", detail: "Job MJ-0011 nearing its configured deadline.", time: "10:55 AM" },
  { id: "AL-3", kind: "info", title: "Node telemetry resumed — NODE_02", detail: "Communication restored after brief drop.", time: "10:20 AM" },
];

export interface CitizenReport {
  id: string;
  pincode: string;
  locality: string;
  electricity: "YES" | "NO" | "PARTIAL";
  description: string;
  time: string;
}

export const REPORTS: CitizenReport[] = [
  { id: "CR-101", pincode: "682020", locality: "Kadavanthra", electricity: "NO", description: "Power gone for ~20 minutes.", time: "10:47 AM" },
  { id: "CR-102", pincode: "682019", locality: "Vyttila", electricity: "PARTIAL", description: "Lights flickering, low voltage.", time: "10:50 AM" },
  { id: "CR-100", pincode: "682016", locality: "Ernakulam South", electricity: "YES", description: "Everything normal now.", time: "10:12 AM" },
];

export type PowerStatus = "AVAILABLE" | "UNAVAILABLE" | "PARTIAL" | "MAINTENANCE" | "UNKNOWN";

export interface PincodeStatus {
  pincode: string;
  location: string;
  district: string;
  status: PowerStatus;
  lastUpdated: string;
  activeFault: boolean;
  maintenance: boolean;
  estRestoration: string | null;
  lat: number;
  lng: number;
  monitored: boolean;
}

/**
 * Pincodes covered by monitoring nodes — these carry real (simulated) live status.
 * Any other valid Kerala pincode is resolved to its locality via the pincode dataset
 * but reported as UNKNOWN (outside the monitored network).
 */
export const MONITORED_PINCODES: Record<string, PincodeStatus> = {
  "682001": { pincode: "682001", location: "Fort Kochi", district: "Ernakulam", status: "AVAILABLE", lastUpdated: "10:52 AM", activeFault: false, maintenance: false, estRestoration: null, lat: 9.965, lng: 76.2424, monitored: true },
  "682002": { pincode: "682002", location: "Mattancherry", district: "Ernakulam", status: "AVAILABLE", lastUpdated: "10:51 AM", activeFault: false, maintenance: false, estRestoration: null, lat: 9.958, lng: 76.259, monitored: true },
  "682016": { pincode: "682016", location: "Ernakulam South", district: "Ernakulam", status: "AVAILABLE", lastUpdated: "10:52 AM", activeFault: false, maintenance: false, estRestoration: null, lat: 9.967, lng: 76.287, monitored: true },
  "682020": { pincode: "682020", location: "Kadavanthra", district: "Ernakulam", status: "UNAVAILABLE", lastUpdated: "10:47 AM", activeFault: true, maintenance: true, estRestoration: "3:30 PM", lat: 9.967, lng: 76.301, monitored: true },
  "682019": { pincode: "682019", location: "Vyttila", district: "Ernakulam", status: "PARTIAL", lastUpdated: "10:50 AM", activeFault: false, maintenance: true, estRestoration: "1:00 PM", lat: 9.968, lng: 76.318, monitored: true },
};
