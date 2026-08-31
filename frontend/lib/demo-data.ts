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

/**
 * The one monitored site: Chelimparambu, Chemberi (PIN 670632), Kannur.
 *
 * Coordinates come from `lib/server/kerala-pins.json`, the same dataset that
 * backs `/api/location/pin/[pin]`, so a pincode search for 670632 lands exactly
 * on the network drawn here instead of a few kilometres off.
 */
export const SIM_SITE = {
  pincode: "670632",
  locality: "Chelimparambu",
  area: "Chelimparambu, Chemberi",
  district: "Kannur",
  lat: 12.0006,
  lng: 75.5262,
};

/**
 * The monitored LT feeder at the site, ordered from the source outward.
 *
 * Baseline is deliberately HEALTHY: every node is online and powered, with one
 * span flagged for scheduled maintenance. A fault only appears when the
 * simulator (or real hardware) actually breaks the line, so the map shows
 * "current available" until something happens.
 */
export const NODES: NodeRow[] = [
  { id: "NODE_01", locality: "Kolayad", pincode: "670650", sequence: 1, status: "ONLINE", voltage: 230, current: 2.4, heartbeat: "OK", lastSeen: "5s ago", comm: "OK", health: "maint", lat: 11.9930, lng: 75.5150 },
  { id: "NODE_02", locality: "Chempanthotty", pincode: "670631", sequence: 2, status: "ONLINE", voltage: 229, current: 2.1, heartbeat: "OK", lastSeen: "4s ago", comm: "OK", health: "normal", lat: 11.9960, lng: 75.5200 },
  { id: "NODE_03", locality: "Kuniyampuzha", pincode: "670632", sequence: 3, status: "ONLINE", voltage: 231, current: 2.2, heartbeat: "OK", lastSeen: "3s ago", comm: "OK", health: "normal", lat: 11.9985, lng: 75.5232 },
  { id: "NODE_04", locality: "Chelimparambu", pincode: "670632", sequence: 4, status: "ONLINE", voltage: 230, current: 2.3, heartbeat: "OK", lastSeen: "3s ago", comm: "OK", health: "normal", lat: 12.0006, lng: 75.5262 },
  { id: "NODE_05", locality: "Chemberi", pincode: "670632", sequence: 5, status: "ONLINE", voltage: 229, current: 2.0, heartbeat: "OK", lastSeen: "4s ago", comm: "OK", health: "normal", lat: 12.0030, lng: 75.5296 },
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
  { id: "OP-01", name: "Field Operator 01", lat: 11.9994, lng: 75.5240, availability: "AVAILABLE" },
  { id: "OP-02", name: "Field Operator 02", lat: 12.0042, lng: 75.5310, availability: "BUSY" },
];

/** Active fault geo point with configurable affected radius (metres). */
export const FAULT_GEO = {
  faultId: "FT-00031",
  nodeId: "NODE_04",
  lat: 12.0006,
  lng: 75.5262,
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
    location: "Chelimparambu (670632)",
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
    location: "Chelimparambu (670632)",
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
    location: "Chemberi (670632)",
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
  { id: "CR-101", pincode: "670632", locality: "Chelimparambu", electricity: "NO", description: "Power gone for ~20 minutes.", time: "10:47 AM" },
  { id: "CR-102", pincode: "670632", locality: "Chemberi", electricity: "PARTIAL", description: "Lights flickering, low voltage.", time: "10:50 AM" },
  { id: "CR-100", pincode: "670631", locality: "Chempanthotty", electricity: "YES", description: "Everything normal now.", time: "10:12 AM" },
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
  // Primary monitored area — the simulator/hardware node sits here. Baseline is
  // AVAILABLE; a live line break flips it to UNAVAILABLE on the map.
  "670632": { pincode: "670632", location: "Chelimparambu, Chemberi", district: "Kannur", status: "AVAILABLE", lastUpdated: "10:52 AM", activeFault: false, maintenance: false, estRestoration: null, lat: 12.0006, lng: 75.5262, monitored: true },
  "670631": { pincode: "670631", location: "Chempanthotty", district: "Kannur", status: "AVAILABLE", lastUpdated: "10:51 AM", activeFault: false, maintenance: false, estRestoration: null, lat: 11.9960, lng: 75.5200, monitored: true },
  "670650": { pincode: "670650", location: "Kolayad", district: "Kannur", status: "MAINTENANCE", lastUpdated: "10:50 AM", activeFault: false, maintenance: true, estRestoration: "1:00 PM", lat: 11.9930, lng: 75.5150, monitored: true },
};

/** Home pincode used for the citizen dashboard's "your area" panel. */
export const DEFAULT_PINCODE = SIM_SITE.pincode;
