"use client";

import { useEffect, useMemo, useState } from "react";
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
  KERALA_CENTER,
  LINE_COORDS,
  OPERATORS_GEO,
  FAULT_GEO,
  type NodeRow,
} from "@/lib/demo-data";
import { KERALA_MASK, KERALA_OUTLINE, KERALA_BBOX } from "@/lib/kerala-geo";

export type MapRole = "USER" | "OPERATOR" | "ADMIN";
export type MapVariant = "full" | "availability" | "operations";

const STATUS_COLORS: Record<string, string> = {
  normal: "#22e874",
  fault: "#ff3b3b",
  maint: "#ffc043",
  info: "#3b9bff",
  unknown: "#8b9a91",
};

const MAINT_NODE_IDS = ["NODE_05"];

/**
 * Fixed framing used when the map is expanded to fullscreen. A fixed center+zoom
 * (rather than fitBounds) guarantees the SAME zoom level on every expand,
 * independent of container-size timing. Matches the reference framing.
 */
const EXPANDED_CENTER: [number, number] = [10.4, 77.2];
const EXPANDED_ZOOM = 7;

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

function Recenter({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useMemo(() => {
    map.setView(center, zoom ?? map.getZoom(), { animate: true });
  }, [center, zoom, map]);
  return null;
}

/**
 * Controls the map's mode:
 *  - collapsed → Kerala-only: clamp bounds, min zoom 7, fit to Kerala.
 *  - expanded  → global view: release bounds, allow zoom-out, show world with
 *    Kerala highlighted; start at a wide view so the state is marked in context.
 */
function MapMode({ expanded }: { expanded: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (expanded) {
      map.setMinZoom(2);
      map.setMaxBounds(undefined as unknown as L.LatLngBoundsExpression);
    } else {
      map.setMaxBounds(KERALA_BBOX);
      map.setMinZoom(7);
    }
    // Recompute size first (container just changed), then apply the fixed framing.
    const t = setTimeout(() => {
      map.invalidateSize();
      if (expanded) {
        // Fixed zoom+center so the first view is identical every time.
        map.setView(EXPANDED_CENTER, EXPANDED_ZOOM, { animate: false });
      } else {
        map.fitBounds(KERALA_BBOX, { padding: [10, 10] });
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
  const showOperators = role !== "USER" && variant !== "availability";

  const forcedLayers: Layers | null = compact
    ? variant === "availability"
      ? { devices: true, lines: true, faults: false, operators: false, radius: false, reports: true, heat: true }
      : { devices: true, lines: true, faults: true, operators: false, radius: true, reports: true, heat: true }
    : null;

  const [layerState, setLayerState] = useState<Layers>({
    devices: true,
    faults: true,
    lines: true,
    operators: showOperators,
    radius: true,
    reports: true,
    heat: true,
  });
  const layers = forcedLayers ?? layerState;

  const [reports, setReports] = useState<CitizenReportGeo[]>([]);
  const [data, setData] = useState<PointsData | null>(null);
  const [expanded, setExpanded] = useState(false);

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
    return () => {
      alive = false;
      clearInterval(t);
    };
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
  const [zoom, setZoom] = useState(14);
  const [pinError, setPinError] = useState<string | null>(null);

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
    if (variant === "availability") {
      return { color: n.health === "normal" ? STATUS_COLORS.normal : STATUS_COLORS.fault, pulse: false };
    }
    if (n.id === FAULT_GEO.nodeId) return { color: STATUS_COLORS.fault, pulse: true };
    if (MAINT_NODE_IDS.includes(n.id)) return { color: STATUS_COLORS.maint, pulse: false };
    return { color: STATUS_COLORS[n.health] ?? STATUS_COLORS.normal, pulse: false };
  }

  const faultIdx = NODES.findIndex((n) => n.health === "fault");
  const normalPart = LINE_COORDS.slice(0, faultIdx + 1);
  const faultPart = faultIdx > 0 ? LINE_COORDS.slice(faultIdx - 1) : [];

  const mapHeight = height ?? (compact ? "22rem" : "70vh");
  // Keep the full dataset's stats, but render a representative sample of
  // density dots. Hundreds of individual React-Leaflet layers are much
  // cheaper to update than all 1,418 markers on every map render.
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
            center={KERALA_CENTER}
            zoom={7}
            minZoom={7}
            maxBounds={KERALA_BBOX}
            maxBoundsViscosity={1.0}
            zoomControl={false}
            preferCanvas
            style={{ height: expanded ? "100%" : mapHeight, width: "100%", background: "#0a0f0b" }}
            scrollWheelZoom
          >
            <TileLayer
              key={expanded ? "world" : "kerala"}
              attribution='&copy; OpenStreetMap contributors &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              noWrap={!expanded}
              {...(!expanded ? { bounds: KERALA_BBOX } : {})}
            />
            <ZoomControl position="bottomright" />
            <MapMode expanded={expanded} />
            {center && <Recenter center={center} zoom={zoom} />}

            {/* Kerala-only mask (removed in fullscreen so the world shows) */}
            {!expanded && (
              <GeoJSON
                data={KERALA_MASK}
                interactive={false}
                style={{ fillColor: "#080b09", fillOpacity: 1, weight: 0, stroke: false }}
              />
            )}
            {/* State outline — highlighted more strongly in the global view */}
            <GeoJSON
              key={expanded ? "outline-world" : "outline-kerala"}
              data={KERALA_OUTLINE}
              interactive={false}
              style={{
                color: "#ff3b3b",
                weight: expanded ? 2.5 : 1.5,
                opacity: expanded ? 1 : 0.7,
                fill: expanded,
                fillColor: "#ff3b3b",
                fillOpacity: expanded ? 0.06 : 0,
              }}
            />

            {/* Heat-style density of every Kerala pincode */}
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

            {layers.lines && normalPart.length > 1 && (
              <Polyline positions={normalPart} pathOptions={{ color: "#22e874", weight: 4, opacity: 0.85 }} />
            )}
            {layers.lines && faultPart.length > 1 && variant !== "availability" && (
              <Polyline positions={faultPart} pathOptions={{ color: "#ff3b3b", weight: 4, opacity: 0.9, dashArray: "6 8" }} />
            )}

            {layers.radius && (
              <Circle
                center={[FAULT_GEO.lat, FAULT_GEO.lng]}
                radius={FAULT_GEO.affectedRadiusM}
                pathOptions={{ color: "#ff3b3b", fillColor: "#ff3b3b", fillOpacity: 0.08, weight: 1 }}
              />
            )}

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

            {layers.faults && (
              <Marker position={[FAULT_GEO.lat, FAULT_GEO.lng]} icon={dotIcon(STATUS_COLORS.fault, true)}>
                <Popup>
                  <div style={{ minWidth: 200 }}>
                    <strong>{FAULT_GEO.faultId}</strong> (ACTIVE)
                    <br />Device: {FAULT_GEO.nodeId}
                    <br />Type: {FAULT_GEO.faultType}
                    <br />Current: {FAULT_GEO.current} A · Voltage: {FAULT_GEO.voltage} V
                    <br />Affected radius: {FAULT_GEO.affectedRadiusM} m
                    <br />Detected: {FAULT_GEO.detectedAt}
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
                    r.electricity === "YES" ? STATUS_COLORS.normal : r.electricity === "PARTIAL" ? STATUS_COLORS.maint : STATUS_COLORS.fault;
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
          <div className="pointer-events-none absolute left-3 top-3 z-[500] flex items-center gap-2">
            <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-md bg-status-fault px-2 py-1 text-xs font-bold tracking-wide text-white shadow">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse-fault" />
              LIVE
            </span>
          </div>

          <div className="absolute right-3 top-3 z-[500] flex items-center gap-2">
            {data && (
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

          {/* In fullscreen the feed floats as an overlay; otherwise it is shown
              as a separate panel below the map. */}
          {feed.length > 0 && expanded && (
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
      {/* Details shown separately BELOW the map (not covering it) */}
      {!expanded && feed.length > 0 && (
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
          Base map © OpenStreetMap contributors © CARTO. Density and activity feed are simulated
          demo data across Kerala pincodes. Fault marker shows an estimated location, not an exact
          distance.
        </p>
      )}
    </div>
  );
}
