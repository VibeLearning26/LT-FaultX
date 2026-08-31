"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { SimulatorState } from "@/lib/simulator-client";

/**
 * SimulatorMap — the simulated fault plotted on the same Leaflet basemap and
 * with the same marker conventions as the production LiveMap, without touching
 * production map code.
 */

function markerHtml(color: string, pulse: boolean) {
  const ring = pulse
    ? `<span style="
        position:absolute;inset:-6px;border-radius:9999px;
        border:2px solid ${color};
        animation: ltfxPulse 1.6s ease-out infinite;
      "></span>`
    : "";
  return `<span style="position:relative;display:block;width:16px;height:16px">
    ${ring}
    <span style="
      position:absolute;inset:0;border-radius:9999px;
      background:${color};border:2px solid #050705;
      box-shadow:0 0 10px ${color};
    "></span>
  </span>`;
}

export default function SimulatorMap({
  state,
  height = "22rem",
}: {
  state: SimulatorState | null;
  height?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const LRef = useRef<any>(null);

  // init once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!boxRef.current || mapRef.current) return;
      const mod: any = await import("leaflet");
      const L: any = mod.default ?? mod;
      if (cancelled || !boxRef.current) return;
      LRef.current = L;

      const map = L.map(boxRef.current, {
        center: [state?.latitude ?? 12.0006, state?.longitude ?? 75.5262],
        zoom: 15,
        scrollWheelZoom: false,
        attributionControl: true,
      });
      L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          className: "ltfx-dark-tiles",
        }
      ).addTo(map);
      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sync marker with simulator state
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map || !state) return;

    const active = state.fault_active;
    const color = active ? "#ff3b3b" : "#22e874";
    const pos: [number, number] = [state.latitude, state.longitude];

    const icon = L.divIcon({
      className: "ltfx-sim-marker",
      html: markerHtml(color, active),
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    const popup = `
      <div style="font-family:ui-sans-serif,system-ui;min-width:220px">
        <div style="font-weight:600;margin-bottom:4px">
          ${active ? "⚡ ACTIVE FAULT" : "✔ NORMAL"} · SIMULATOR
        </div>
        <table style="font-size:11px;line-height:1.5">
          <tr><td style="opacity:.6;padding-right:8px">Fault ID</td><td><code>${state.fault_id ?? "—"}</code></td></tr>
          <tr><td style="opacity:.6">Type</td><td>${state.fault_type ?? "—"}</td></tr>
          <tr><td style="opacity:.6">Status</td><td>${state.fault_status ?? (active ? "ACTIVE" : "RESOLVED")}</td></tr>
          <tr><td style="opacity:.6">Location</td><td>${state.latitude.toFixed(4)}, ${state.longitude.toFixed(4)}</td></tr>
          <tr><td style="opacity:.6">Area</td><td>${state.area}</td></tr>
          <tr><td style="opacity:.6">PIN code</td><td>${state.pincode}</td></tr>
          <tr><td style="opacity:.6">Pole / node</td><td>${state.pole} · ${state.device_id}</td></tr>
          <tr><td style="opacity:.6">Detected</td><td>${state.detected_at ? new Date(state.detected_at).toLocaleString() : "—"}</td></tr>
          <tr><td style="opacity:.6">Operator</td><td>${state.operator_name ?? "—"}</td></tr>
          <tr><td style="opacity:.6">Emergency</td><td>${state.emergency_status}${state.emergency_service ? ` · ${state.emergency_service}` : ""}</td></tr>
        </table>
        <div style="margin-top:6px;font-size:10px;opacity:.55">
          Simulated event (source=SIMULATOR) · estimated span, not an exact distance
        </div>
      </div>`;

    if (markerRef.current) {
      markerRef.current.setLatLng(pos).setIcon(icon).setPopupContent(popup);
    } else {
      markerRef.current = L.marker(pos, { icon, title: state.device_id })
        .addTo(map)
        .bindPopup(popup);
    }

    // affected-area ring while the fault is live
    if (active) {
      if (circleRef.current) {
        circleRef.current.setLatLng(pos);
      } else {
        circleRef.current = L.circle(pos, {
          radius: 500,
          color: "#ff3b3b",
          weight: 1,
          fillColor: "#ff3b3b",
          fillOpacity: 0.12,
        }).addTo(map);
      }
    } else if (circleRef.current) {
      map.removeLayer(circleRef.current);
      circleRef.current = null;
    }
  }, [state]);

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-brand-100/85">Live Fault Map</h3>
        <span className={`pill ${state?.fault_active ? "pill-fault" : "pill-normal"}`}>
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
          {state?.fault_active ? "Marker ACTIVE" : "Marker NORMAL"}
        </span>
      </div>
      <div
        ref={boxRef}
        style={{ height }}
        className="w-full overflow-hidden rounded-lg border border-brand-500/15"
      />
      <p className="mt-2 text-xs text-brand-100/40">
        Simulated node plotted at the configured simulator coordinates. Status is never
        shown by colour alone — see the marker popup and status panel.
      </p>
    </div>
  );
}
