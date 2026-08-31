"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  CircleMarker,
  GeoJSON,
  ZoomControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  NODES,
  OPERATORS_GEO,
  MONITORED_PINCODES,
  SIM_SITE,
  type NodeRow,
  type PincodeStatus,
} from "@/lib/demo-data";
import { KERALA_MASK, KERALA_OUTLINE, KERALA_BBOX } from "@/lib/kerala-geo";
import { useHardware } from "@/lib/hardware-context";
import {
  fetchSimulatorState,
  subscribeSimulatorState,
  type SimulatorState,
} from "@/lib/simulator-client";

export type MapRole = "USER" | "OPERATOR" | "ADMIN";
/**
 * `availability` — where current is present right now (outage view).
 * `operations`   — line condition: broken spans, maintenance spans, live spans.
 * `full`         — both, with manual layer toggles.
 */
export type MapVariant = "full" | "availability" | "operations";

const STATUS_COLORS: Record<string, string> = {
  normal: "#22e874",
  fault: "#ff3b3b",
  maint: "#ffc043",
  info: "#3b9bff",
  unknown: "#8b9a91",
};

/** Colour per power-availability status (always paired with a text label). */
const AVAILABILITY_COLORS: Record<string, string> = {
  AVAILABLE: STATUS_COLORS.normal,
  UNAVAILABLE: STATUS_COLORS.fault,
  PARTIAL: STATUS_COLORS.maint,
  MAINTENANCE: STATUS_COLORS.maint,
  UNKNOWN: STATUS_COLORS.unknown,
};

/** Spans flagged for scheduled maintenance (amber, still energised). */
const MAINT_NODE_IDS = ["NODE_01"];

/** Everything outside Kerala is painted over with the app background. */
const MASK_FILL = "#05080a";

/**
 * Default framing, identical on every map instance and every mount.
 *
 * A fixed center+zoom is used instead of `fitBounds` on purpose: fitBounds
 * derives its zoom from the container size, so two cards of different widths
 * (and the same card before/after layout settles) ended up at different zoom
 * levels. This keeps the two dashboard maps visually identical, and it is only
 * applied until the user pans or zooms — after that the map is theirs.
 */
const DEFAULT_VIEW = { center: [10.55, 76.35] as [number, number], zoom: 7 };

/** Framing used when focusing the monitored site or a live fault. */
const SITE_CENTER: [number, number] = [SIM_SITE.lat, SIM_SITE.lng];
const SITE_ZOOM = 13;

/** Panning is clamped to Kerala's own bounding box. */
const MAP_BOUNDS = KERALA_BBOX;

/** Radius (m) of the shaded availability area drawn per monitored pincode. */
const AREA_RADIUS_M = 1400;

function dotIcon(color: string, pulse = false) {
  const ring = pulse
    ? `<span style="position:absolute;inset:-6px;border-radius:9999px;border:2px solid ${color};opacity:.5;animation:ltfxPulse 1.4s ease-out infinite"></span>`
    : "";
  return L.divIcon({
    className: "ltfx-marker",
    html: `<div style="position:relative;display:grid;place-items:center">
      ${ring}
      <span style="width:14px;height:14px;border-radius:9999px;background:${color};
        box-shadow:0 0 0 3px rgba(0,0,0,.6),0 0 10px ${color};border:2px solid #0a0f0b"></span>
    </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -8],
  });
}

function operatorIcon(available: boolean) {
  const color = available ? "#22e874" : "#ffc043";
  return L.divIcon({
    className: "ltfx-marker",
    html: `<div style="width:16px;height:16px;background:${color};border:2px solid #0a0f0b;
      transform:rotate(45deg);box-shadow:0 0 0 3px rgba(0,0,0,.6),0 0 8px ${color}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

function reportIcon(color: string) {
  return L.divIcon({
    className: "ltfx-marker",
    html: `<div style="width:16px;height:16px;border-radius:9999px;border:3px solid ${color};
      background:rgba(10,15,11,.7);box-shadow:0 0 0 2px rgba(0,0,0,.5),0 0 8px ${color}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -9],
  });
}

/**
 * Renders children into document.body when active, so a fullscreen overlay
 * escapes any ancestor with transform/filter/backdrop-filter (e.g. our `.card`),
 * which would otherwise trap `position: fixed` inside that ancestor's box.
 */
function PortalWrap({ active, children }: { active: boolean; children: React.ReactNode }) {
  if (active && typeof document !== "undefined") {
    return createPortal(children, document.body);
  }
  return <>{children}</>;
}
interface CitizenReportGeo {
  id: string;
  pincode: string;
  locality: string;
  electricity: "YES" | "NO" | "PARTIAL";
  description: string;
  lat: number | null;
  lng: number | null;
  district: string | null;
  createdAt: string;
}

interface FeedItem {
  status: "AVAILABLE" | "OUTAGE" | "PARTIAL";
  agoMin: number;
  pincode: string;
  office: string;
  district: string;
}

interface PointsData {
  points: [number, number, "a" | "o"][];
  feed: FeedItem[];
  stats: { total: number; outages: number; available: number };
}

/** One span of the feeder, between two consecutive nodes. */
type SegKind = "active" | "maint" | "fault";
interface Segment {
  id: string;
  from: NodeRow;
  to: NodeRow;
  kind: SegKind;
}

const SEG_STYLE: Record<SegKind, { color: string; dashArray?: string; label: string }> = {
  active: { color: STATUS_COLORS.normal, label: "Active line (energised)" },
  maint: { color: STATUS_COLORS.maint, dashArray: "10 6", label: "Maintenance span" },
  fault: { color: STATUS_COLORS.fault, dashArray: "6 8", label: "Broken / de-energised span" },
};

function Recenter({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom ?? map.getZoom(), { animate: true });
  }, [center, zoom, map]);
  return null;
}
/**
 * Keeps the map inside Kerala at all times (including fullscreen) and holds the
 * fixed default framing until the user takes over. Nothing outside the state is
 * reachable: pan is clamped to Kerala's bbox and zoom-out stops at the state.
 */
function MapMode({ expanded }: { expanded: boolean }) {
  const map = useMap();
  const userMoved = useRef(false);

  // Any real interaction (drag, wheel, double-click, keyboard, zoom buttons)
  // permanently releases the automatic framing for this map instance.
  useEffect(() => {
    const release = () => { userMoved.current = true; };
    const container = map.getContainer();
    map.on("dragstart", release);
    map.on("dblclick", release);
    container.addEventListener("wheel", release, { passive: true });
    container.addEventListener("pointerdown", release);
    return () => {
      map.off("dragstart", release);
      map.off("dblclick", release);
      container.removeEventListener("wheel", release);
      container.removeEventListener("pointerdown", release);
    };
  }, [map]);

  useEffect(() => {
    map.setMaxBounds(MAP_BOUNDS);
    map.setMinZoom(6);
    const t = setTimeout(() => {
      map.invalidateSize();
      if (!userMoved.current) {
        map.setView(DEFAULT_VIEW.center, DEFAULT_VIEW.zoom, { animate: false });
      }
    }, 320);
    return () => clearTimeout(t);
  }, [expanded, map]);
  return null;
}

interface Layers {
  devices: boolean;
  faults: boolean;
  lines: boolean;
  operators: boolean;
  radius: boolean;
  reports: boolean;
  heat: boolean;
  /** Shaded power-availability area per monitored pincode. */
  areas: boolean;
}

/** Great-circle-ish distance in metres, good enough for nearest-node matching. */
function metresBetween(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat = ((a[0] + b[0]) / 2) * (Math.PI / 180);
  const x = dLng * Math.cos(lat);
  return Math.sqrt(dLat * dLat + x * x) * R;
}
export default function LiveMap({
  role = "OPERATOR",
  variant = "full",
  compact = false,
  height,
}: {
  role?: MapRole;
  variant?: MapVariant;
  compact?: boolean;
  height?: string;
}) {
  const isAvailability = variant === "availability";
  const showOperators = role !== "USER" && !isAvailability;

  /**
   * The two dashboard maps are driven purely by `variant`:
   *  - availability → shaded areas + citizen reports + density, no line detail.
   *  - operations   → feeder spans, node health, fault marker + radius.
   */
  const forcedLayers: Layers | null = compact
    ? isAvailability
      ? { devices: true, lines: false, faults: true, operators: false, radius: true, reports: true, heat: true, areas: true }
      : { devices: true, lines: true, faults: true, operators: showOperators, radius: true, reports: false, heat: false, areas: false }
    : null;

  const [layerState, setLayerState] = useState<Layers>({
    devices: true,
    faults: true,
    lines: true,
    operators: showOperators,
    radius: true,
    reports: true,
    heat: true,
    areas: true,
  });
  const layers = forcedLayers ?? layerState;

  const [reports, setReports] = useState<CitizenReportGeo[]>([]);
  const [data, setData] = useState<PointsData | null>(null);
  const [expanded, setExpanded] = useState(false);

  // --- live simulator / hardware fault feed ---
  // Three independent paths, so a break is never missed: the backend WebSocket,
  // a same-tab-group BroadcastChannel from /simulator, and a short poll.
  const { onEvent } = useHardware();
  const [liveSim, setLiveSim] = useState<SimulatorState | null>(null);
  useEffect(() => onEvent("simulator", (d: SimulatorState) => setLiveSim(d)), [onEvent]);
  useEffect(() => subscribeSimulatorState((s) => setLiveSim(s)), []);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetchSimulatorState()
        .then((s) => alive && setLiveSim(s))
        .catch(() => {});
    load();
    const t = setInterval(load, 3000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  const simFault =
    liveSim?.fault_active && Number.isFinite(liveSim.latitude) && Number.isFinite(liveSim.longitude)
      ? liveSim
      : null;

  /** Node closest to the live fault — the first failed node on the feeder. */
  const faultIdx = useMemo(() => {
    if (!simFault) return null;
    const p: [number, number] = [simFault.latitude, simFault.longitude];
    let best = 0;
    let bestD = Infinity;
    NODES.forEach((n, i) => {
      const d = metresBetween(p, [n.lat, n.lng]);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }, [simFault?.fault_id, simFault?.latitude, simFault?.longitude]);

  /** Feeder spans, coloured by condition. Everything past the break is dead. */
  const segments = useMemo<Segment[]>(() => {
    const out: Segment[] = [];
    for (let i = 0; i < NODES.length - 1; i++) {
      const from = NODES[i];
      const to = NODES[i + 1];
      const broken = faultIdx != null && i + 1 >= faultIdx;
      const kind: SegKind = broken
        ? "fault"
        : MAINT_NODE_IDS.includes(from.id) || MAINT_NODE_IDS.includes(to.id)
          ? "maint"
          : "active";
      out.push({ id: `${from.id}-${to.id}`, from, to, kind });
    }
    return out;
  }, [faultIdx]);

  /** Availability per monitored pincode, with the live fault applied on top. */
  const areas = useMemo(() => {
    const base: PincodeStatus[] = Object.values(MONITORED_PINCODES).map((a) => ({ ...a }));
    if (!simFault || faultIdx == null) return base;
    const dead = new Set(NODES.slice(faultIdx).map((n) => n.pincode));
    dead.add(simFault.pincode);
    return base.map((a) =>
      dead.has(a.pincode)
        ? { ...a, status: "UNAVAILABLE" as const, activeFault: true, estRestoration: a.estRestoration }
        : a
    );
  }, [simFault?.fault_id, faultIdx]);
  useEffect(() => {
    let alive = true;
    const load = () => {
      if (document.visibilityState === "hidden") return;
      fetch("/api/outage-reports")
        .then((r) => r.json())
        .then((d) => alive && setReports(d.reports ?? []))
        .catch(() => {});
      fetch("/api/map/points")
        .then((r) => r.json())
        .then((d) => alive && setData(d))
        .catch(() => {});
    };
    load();
    const t = setInterval(load, 20000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // Close fullscreen on Escape.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExpanded(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const [pin, setPin] = useState("");
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [zoom, setZoom] = useState(SITE_ZOOM);
  const [pinError, setPinError] = useState<string | null>(null);

  /**
   * A live fault does NOT move the map on its own — the default framing stays
   * put until the user asks for it, either by scrolling or by clicking the
   * fault badge. The break is still visible where it happened, at its pincode.
   */
  const focusFault = () => {
    if (!simFault) return;
    setCenter([simFault.latitude, simFault.longitude]);
    setZoom(14);
  };

  const focusSite = () => {
    setCenter(SITE_CENTER);
    setZoom(SITE_ZOOM);
  };

  async function searchPin(e: React.FormEvent) {
    e.preventDefault();
    setPinError(null);
    const p = pin.trim();
    if (!/^\d{6}$/.test(p)) {
      setPinError("Enter a valid 6-digit pincode.");
      return;
    }
    try {
      const res = await fetch(`/api/location/pin/${p}`);
      const d = await res.json();
      if (!res.ok) {
        setPinError(d.error ?? "Pincode lookup failed.");
        return;
      }
      setCenter([d.lat, d.lng]);
      setZoom(14);
    } catch {
      setPinError("Network error during pincode lookup.");
    }
  }
  const toggle = (k: keyof Layers) => setLayerState((s) => ({ ...s, [k]: !s[k] }));

  function nodeColor(n: NodeRow): { color: string; pulse: boolean } {
    const idx = NODES.findIndex((x) => x.id === n.id);
    if (faultIdx != null && idx === faultIdx) return { color: STATUS_COLORS.fault, pulse: true };
    if (faultIdx != null && idx > faultIdx) return { color: STATUS_COLORS.fault, pulse: false };
    if (MAINT_NODE_IDS.includes(n.id)) return { color: STATUS_COLORS.maint, pulse: false };
    return { color: STATUS_COLORS[n.health] ?? STATUS_COLORS.normal, pulse: false };
  }

  const mapHeight = height ?? (compact ? "22rem" : "70vh");
  // Keep the full dataset's stats, but render a representative sample of
  // density dots — hundreds of layers update far cheaper than all 1,418.
  const pointStep = compact ? 4 : expanded ? 2 : 3;
  const heatPoints = (data?.points ?? []).filter((_, i) => i % pointStep === 0);
  const feed = (data?.feed ?? []).slice(0, compact ? 4 : 7);

  const feedColor = (s: FeedItem["status"]) =>
    s === "OUTAGE" ? STATUS_COLORS.fault : s === "PARTIAL" ? STATUS_COLORS.maint : STATUS_COLORS.normal;

  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={searchPin} className="flex gap-2">
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              inputMode="numeric"
              placeholder="Search pincode"
              className="w-44 rounded-lg border border-brand-500/20 bg-ink-950/60 px-3 py-1.5 text-sm text-brand-50 placeholder:text-brand-100/30 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
            <button type="submit" className="btn-primary text-sm">Search</button>
          </form>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {(
              [
                ["areas", "Availability areas"],
                ["heat", "Heat"],
                ["devices", "Devices"],
                ["faults", "Faults"],
                ["lines", "Lines"],
                ["reports", "Citizen reports"],
                ...(showOperators ? [["operators", "Operators"] as const] : []),
                ["radius", "Fault radius"],
              ] as [keyof Layers, string][]
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => toggle(k)}
                className={[
                  "rounded-full border px-3 py-1 transition",
                  layers[k]
                    ? "border-brand-400/50 bg-brand-500/15 text-brand-200"
                    : "border-brand-500/20 text-brand-100/40",
                ].join(" ")}
              >
                {layers[k] ? "☑" : "☐"} {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {pinError && <p className="text-sm text-status-fault">{pinError}</p>}
      <PortalWrap active={expanded}>
        <div
          className={
            expanded
              ? "fixed inset-0 z-[10000] bg-ink-950 p-2 sm:p-3"
              : "relative overflow-hidden rounded-xl border border-brand-500/20 shadow-card"
          }
        >
        <div className={expanded ? "relative h-full w-full overflow-hidden rounded-xl border border-brand-500/20" : "relative"}>
          <MapContainer
            center={SITE_CENTER}
            zoom={SITE_ZOOM}
            minZoom={7}
            maxBounds={MAP_BOUNDS}
            maxBoundsViscosity={1.0}
            zoomControl={false}
            preferCanvas
            style={{ height: expanded ? "100%" : mapHeight, width: "100%", background: MASK_FILL }}
            scrollWheelZoom
          >
            {/* Keyless OSM raster tiles, darkened via CSS on the tile pane only. */}
            <TileLayer
              className="ltfx-dark-tiles"
              attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
              noWrap
              bounds={MAP_BOUNDS}
            />
            <ZoomControl position="bottomright" />
            <MapMode expanded={expanded} />
            {center && <Recenter center={center} zoom={zoom} />}

            {/*
              Kerala-only: one polygon covering the whole world with the Kerala
              districts punched out as holes, filled opaque. Every tile, label
              and place name outside the state is painted over. Added first so
              the feeder, markers and areas draw on top of it.
            */}
            <GeoJSON
              data={KERALA_MASK}
              interactive={false}
              style={{ fillColor: MASK_FILL, fillOpacity: 1, weight: 0, stroke: false }}
            />
            <GeoJSON
              data={KERALA_OUTLINE}
              interactive={false}
              style={{ color: "#22e874", weight: 1.2, opacity: 0.55, fill: false }}
            />
            {/* Where current is present right now, per monitored pincode. */}
            {layers.areas &&
              areas.map((a) => {
                const color = AVAILABILITY_COLORS[a.status] ?? AVAILABILITY_COLORS.UNKNOWN;
                return (
                  <Circle
                    key={a.pincode}
                    center={[a.lat, a.lng]}
                    radius={AREA_RADIUS_M}
                    pathOptions={{
                      color,
                      fillColor: color,
                      fillOpacity: a.status === "AVAILABLE" ? 0.1 : 0.2,
                      weight: 1.5,
                      dashArray: a.status === "AVAILABLE" ? undefined : "5 5",
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: 200 }}>
                        <strong>{a.location}</strong> · {a.pincode}
                        <br />District: {a.district}
                        <br />Power: <strong>{a.status}</strong>
                        {a.activeFault && <><br />Active fault reported on this feeder.</>}
                        {a.maintenance && <><br />Scheduled maintenance in progress.</>}
                        {a.estRestoration && <><br />Est. restoration: {a.estRestoration}</>}
                        <br />Updated: {a.lastUpdated}
                      </div>
                    </Popup>
                  </Circle>
                );
              })}

            {/* Pixel-sized marks so the monitored areas read at any zoom. */}
            {layers.areas &&
              areas.map((a) => {
                const color = AVAILABILITY_COLORS[a.status] ?? AVAILABILITY_COLORS.UNKNOWN;
                return (
                  <CircleMarker
                    key={`m-${a.pincode}`}
                    center={[a.lat, a.lng]}
                    radius={8}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.35, weight: 2 }}
                  >
                    <Popup>
                      <div style={{ minWidth: 170 }}>
                        <strong>{a.location}</strong> · {a.pincode}
                        <br />Power: <strong>{a.status}</strong>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}

            {/* Density of every Kerala pincode (availability view only). */}
            {layers.heat &&
              heatPoints.map((p, i) => (
                <CircleMarker
                  key={i}
                  center={[p[0], p[1]]}
                  radius={p[2] === "o" ? 3.5 : 2}
                  pathOptions={{
                    color: p[2] === "o" ? STATUS_COLORS.fault : STATUS_COLORS.normal,
                    fillColor: p[2] === "o" ? STATUS_COLORS.fault : STATUS_COLORS.normal,
                    fillOpacity: p[2] === "o" ? 0.9 : 0.55,
                    weight: 0,
                  }}
                />
              ))}
            {/* Feeder spans: active / maintenance / broken. */}
            {layers.lines &&
              segments.map((s) => {
                const st = SEG_STYLE[s.kind];
                return (
                  <Polyline
                    key={s.id}
                    positions={[[s.from.lat, s.from.lng], [s.to.lat, s.to.lng]]}
                    pathOptions={{
                      color: st.color,
                      weight: 4,
                      opacity: 0.9,
                      dashArray: st.dashArray,
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: 190 }}>
                        <strong>{s.from.id} → {s.to.id}</strong>
                        <br />{s.from.locality} → {s.to.locality}
                        <br />Condition: <strong>{st.label}</strong>
                        {s.kind === "fault" && <><br /><em>Estimated span — not an exact break point.</em></>}
                      </div>
                    </Popup>
                  </Polyline>
                );
              })}

            {layers.devices &&
              NODES.map((n: NodeRow) => {
                const { color, pulse } = nodeColor(n);
                return (
                  <Marker key={n.id} position={[n.lat, n.lng]} icon={dotIcon(color, pulse)}>
                    <Popup>
                      <div style={{ minWidth: 180 }}>
                        <strong>{n.id}</strong> — {n.locality}
                        <br />Pincode: {n.pincode}
                        <br />Status: {n.status}
                        <br />Voltage: {n.voltage ? `${n.voltage} V` : "—"}
                        <br />Current: {n.current ? `${n.current} A` : "—"}
                        <br />Last seen: {n.lastSeen}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            {/*
              The only fault drawn is a real one: it comes from the simulator or
              the ESP32 hardware over /ws/telemetry, so the map shows "current
              available" until the line actually breaks.
            */}
            {layers.radius && simFault && (
              <>
                <Circle
                  center={[simFault.latitude, simFault.longitude]}
                  radius={500}
                  pathOptions={{ color: STATUS_COLORS.fault, fillColor: STATUS_COLORS.fault, fillOpacity: 0.08, weight: 1 }}
                />
                {/*
                  Pixel-sized halo: the 500 m radius shrinks to nothing at the
                  default state-wide zoom, so the break stays conspicuous
                  without the map having to zoom itself in.
                */}
                <CircleMarker
                  center={[simFault.latitude, simFault.longitude]}
                  radius={13}
                  pathOptions={{ color: STATUS_COLORS.fault, fillColor: STATUS_COLORS.fault, fillOpacity: 0.22, weight: 2 }}
                />
              </>
            )}
            {layers.faults && simFault && (
              <Marker
                position={[simFault.latitude, simFault.longitude]}
                icon={dotIcon(STATUS_COLORS.fault, true)}
              >
                <Popup>
                  <div style={{ minWidth: 210 }}>
                    <strong>{simFault.fault_id ?? "Live fault"}</strong> ({simFault.fault_status ?? "ACTIVE"})
                    <br />Device: {simFault.device_id}
                    <br />Type: {simFault.fault_type ?? "Broken / open conductor"}
                    <br />Area: {simFault.area}
                    <br />Pincode: {simFault.pincode}
                    <br />Span: {simFault.pole}
                    {simFault.detected_at && <><br />Detected: {new Date(simFault.detected_at).toLocaleTimeString()}</>}
                    {simFault.operator_name && <><br />Operator: {simFault.operator_name}</>}
                    <br />Emergency: {simFault.emergency_status}
                    <br /><em>Estimated segment only — not an exact distance.</em>
                  </div>
                </Popup>
              </Marker>
            )}

            {layers.operators &&
              showOperators &&
              OPERATORS_GEO.map((o) => (
                <Marker key={o.id} position={[o.lat, o.lng]} icon={operatorIcon(o.availability === "AVAILABLE")}>
                  <Popup>
                    <div style={{ minWidth: 160 }}>
                      <strong>{o.name}</strong>
                      <br />ID: {o.id}
                      <br />Availability: {o.availability}
                    </div>
                  </Popup>
                </Marker>
              ))}
            {layers.reports &&
              reports
                .filter((r) => r.lat != null && r.lng != null)
                .map((r) => {
                  const color =
                    r.electricity === "YES"
                      ? STATUS_COLORS.normal
                      : r.electricity === "PARTIAL"
                        ? STATUS_COLORS.maint
                        : STATUS_COLORS.fault;
                  return (
                    <Marker key={r.id} position={[r.lat as number, r.lng as number]} icon={reportIcon(color)}>
                      <Popup>
                        <div style={{ minWidth: 190 }}>
                          <strong>Citizen report</strong> ({r.id})
                          <br />{r.locality} · {r.pincode}{r.district ? ` · ${r.district}` : ""}
                          <br />Electricity: {r.electricity}
                          <br />{r.description && <>“{r.description}”<br /></>}
                          <em>User-reported — pending verification.</em>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
          </MapContainer>

          {/* --- Overlays --- */}
          <div className="pointer-events-none absolute left-3 top-3 z-[500] flex flex-wrap items-center gap-2">
            <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-md bg-status-fault px-2 py-1 text-xs font-bold tracking-wide text-white shadow">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse-fault" />
              LIVE
            </span>
            {simFault ? (
              <button
                onClick={focusFault}
                title="Zoom to the detected break"
                className="pointer-events-auto rounded-md border border-status-fault/60 bg-ink-950/85 px-2 py-1 text-xs font-semibold text-status-fault backdrop-blur transition hover:border-status-fault"
              >
                ⚡ FAULT DETECTED · {simFault.pincode} — zoom in
              </button>
            ) : (
              <button
                onClick={focusSite}
                title="Zoom to the monitored area"
                className="pointer-events-auto rounded-md border border-brand-500/40 bg-ink-950/85 px-2 py-1 text-xs font-semibold text-brand-200 backdrop-blur transition hover:border-brand-400"
              >
                ✔ CURRENT AVAILABLE · {SIM_SITE.pincode}
              </button>
            )}
          </div>
          <div className="absolute right-3 top-3 z-[500] flex items-center gap-2">
            {data && isAvailability && (
              <span className="rounded-md border border-brand-500/30 bg-ink-950/80 px-2 py-1 text-xs text-brand-100/80 backdrop-blur">
                {data.stats.available.toLocaleString()} ok · {data.stats.outages} out
              </span>
            )}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="rounded-md border border-brand-500/30 bg-ink-950/80 px-2.5 py-1 text-xs text-brand-100 backdrop-blur transition hover:border-brand-400"
            >
              {expanded ? "✕ Close" : "⤢ Expand"}
            </button>
          </div>

          {feed.length > 0 && expanded && isAvailability && (
            <div className="absolute bottom-3 left-3 z-[500] max-h-[45%] w-72 max-w-[80%] overflow-y-auto rounded-lg border border-brand-500/20 bg-ink-950/85 p-3 text-xs backdrop-blur">
              <p className="mb-1.5 font-semibold uppercase tracking-wide text-brand-100/50">Live activity</p>
              <ul className="space-y-1.5">
                {feed.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: feedColor(f.status) }} />
                    <span className="leading-tight">
                      <span style={{ color: feedColor(f.status) }} className="font-semibold">
                        {f.status === "OUTAGE" ? "Outage" : f.status === "PARTIAL" ? "Partial" : "Available"}
                      </span>{" "}
                      <span className="text-brand-100/40">{f.agoMin}m ago · {f.pincode}</span>
                      <br />
                      <span className="text-brand-100/70">
                        {f.office}
                        {f.district && !f.office.includes(f.district) ? ` (${f.district})` : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      </PortalWrap>
      {/* Activity list sits BELOW the map so it never covers it. */}
      {!expanded && isAvailability && feed.length > 0 && (
        <div className="card p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-100/50">
            Live activity
          </p>
          <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {feed.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: feedColor(f.status) }}
                />
                <span className="leading-tight">
                  <span style={{ color: feedColor(f.status) }} className="font-semibold">
                    {f.status === "OUTAGE" ? "Outage" : f.status === "PARTIAL" ? "Partial" : "Available"}
                  </span>{" "}
                  <span className="text-brand-100/40">
                    {f.agoMin}m ago · {f.pincode}
                  </span>
                  <br />
                  <span className="text-brand-100/70">
                    {f.office}
                    {f.district && !f.office.includes(f.district) ? ` (${f.district})` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!compact && !expanded && (
        <p className="text-xs text-brand-100/40">
          Base map © OpenStreetMap contributors. The view is masked and clamped to Kerala only.
          Faults come from live telemetry and show an estimated location, not an exact distance.
        </p>
      )}
    </div>
  );
}
