"use client";

import { useEffect, useState } from "react";
import { useHardware } from "@/lib/hardware-context";
import LiveMapLoader from "@/components/LiveMapLoader";
import { DEFAULT_PINCODE, MONITORED_PINCODES, SIM_SITE } from "@/lib/demo-data";
import { fetchSimulatorState, subscribeSimulatorState, type SimulatorState } from "@/lib/simulator-client";

const DEVICE_IDS = ["ESP32-POLE-01", "ESP32-POLE-02", "ESP32-POLE-03"];

/** The citizen's own area — the monitored site at Chelimparambu, Chemberi. */
const HOME = MONITORED_PINCODES[DEFAULT_PINCODE];

export default function UserHome() {
  const { telemetryByDevice, statusByDevice, onEvent } = useHardware();

  // Live fault feed (simulator or ESP32 hardware), same three paths as the maps:
  // backend WebSocket, cross-tab broadcast from /simulator, and a short poll.
  const [sim, setSim] = useState<SimulatorState | null>(null);
  useEffect(() => onEvent("simulator", (d: SimulatorState) => setSim(d)), [onEvent]);
  useEffect(() => subscribeSimulatorState((s) => setSim(s)), []);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetchSimulatorState()
        .then((s) => alive && setSim(s))
        .catch(() => {});
    load();
    const t = setInterval(load, 3000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const hwFaults = DEVICE_IDS.filter((id) => {
    const t = telemetryByDevice[id];
    const s = statusByDevice[id];
    return t?.fault || t?.line_status === "FAULT" || s?.fault;
  }).length;

  const simFault = sim?.fault_active ?? false;
  const faultCount = hwFaults + (simFault ? 1 : 0);
  const outageLabel = faultCount > 0 ? `${faultCount} reported` : "None reported";

  const maintCount = Object.values(MONITORED_PINCODES).filter((a) => a.maintenance).length;

  /** Home area loses power when the live fault is in (or upstream of) it. */
  const homeOut = simFault && (sim?.pincode === DEFAULT_PINCODE || hwFaults > 0);
  const homeStatus = homeOut ? "UNAVAILABLE" : HOME?.status ?? "UNKNOWN";
  const homePill =
    homeStatus === "UNAVAILABLE" ? "pill-fault" : homeStatus === "MAINTENANCE" ? "pill-maint" : "pill-normal";
  const homeLabel =
    homeStatus === "UNAVAILABLE"
      ? "No electricity — fault detected"
      : homeStatus === "MAINTENANCE"
        ? "Maintenance in progress"
        : "Electricity available";
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome</h1>
        <p className="text-sm text-brand-100/50">
          Check electricity availability, report outages, and stay informed.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-brand-100/40">Your area</p>
          <p className="mt-2 text-lg font-semibold">
            {SIM_SITE.area}
          </p>
          <p className="text-xs text-brand-100/40">
            Pincode {DEFAULT_PINCODE} · {SIM_SITE.district}
          </p>
          <span className={`pill ${homePill} mt-3`}>
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            {homeLabel}
          </span>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-brand-100/40">Active faults</p>
          <p className={`mt-2 text-3xl font-bold ${faultCount > 0 ? "text-status-fault" : "text-status-normal"}`}>
            {faultCount}
          </p>
          <p className="mt-1 text-xs text-brand-100/40">{outageLabel}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-brand-100/40">Maintenance</p>
          <p className="mt-2 text-3xl font-bold">{maintCount || "None"}</p>
          <p className="mt-1 text-xs text-brand-100/40">
            {maintCount ? "Scheduled work on the feeder" : "No scheduled work"}
          </p>
        </div>
      </div>
      {/* Two maps: where current is present, and what the line is doing. */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card p-4">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-brand-100/90">Power availability (outage map)</p>
            <div className="flex flex-wrap gap-2">
              <span className="pill pill-normal">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                Current available
              </span>
              <span className="pill pill-fault">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                No current
              </span>
              <span className="pill pill-maint">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                Partial / maintenance
              </span>
            </div>
          </div>
          <p className="mb-3 text-xs text-brand-100/40">
            Shaded areas show where electricity is present right now, per pincode.
          </p>
          <LiveMapLoader role="USER" variant="availability" compact height="24rem" />
        </div>

        <div className="card p-4">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-brand-100/90">Line condition (detection map)</p>
            <div className="flex flex-wrap gap-2">
              <span className="pill pill-normal">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                Active line
              </span>
              <span className="pill pill-fault">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                Broken span
              </span>
              <span className="pill pill-maint">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                Maintenance span
              </span>
            </div>
          </div>
          <p className="mb-3 text-xs text-brand-100/40">
            Each span between two poles is drawn by condition; a detected break turns red and
            dashed, with the estimated affected radius around it.
          </p>
          <LiveMapLoader role="USER" variant="operations" compact height="24rem" />
        </div>
      </div>

      <p className="text-xs text-brand-100/40">
        Demo / simulated data. Status is never shown by colour alone. Estimated restoration
        times, when shown, are estimates only.
      </p>
    </div>
  );
}
