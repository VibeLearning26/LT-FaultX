"use client";

import { useEffect, useRef, useState } from "react";
import { useHardware } from "@/lib/hardware-context";

interface MapProps {
  center?: [number, number];
  zoom?: number;
}

export default function FaultMap({ center = [9.9312, 76.2673], zoom = 13 }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const { telemetryByDevice } = useHardware();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const initMap = async () => {
      const L = await import("leaflet");

      const map = L.map(mapRef.current!).setView(center, zoom);
      mapInstance.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      setReady(true);
    };

    initMap();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [center, zoom]);

  useEffect(() => {
    if (!ready || !mapInstance.current) return;
    const L = (window as any).L;

    Object.values(telemetryByDevice).forEach((device: any) => {
      const isFault = device.fault || device.line_status === "FAULT";
      const color = isFault ? "#ef4444" : "#22c55e";
      const deviceId = device.device_id || "unknown";

      const icon = L.divIcon({
        className: "fault-marker",
        html: `<div style="
          width: 24px; height: 24px; border-radius: 50%;
          background: ${color}; border: 3px solid white;
          box-shadow: 0 0 10px ${color};
          animation: pulse 2s infinite;
        "></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const lat = device.latitude || 9.9312 + (Math.random() - 0.5) * 0.02;
      const lng = device.longitude || 76.2673 + (Math.random() - 0.5) * 0.02;

      if (markersRef.current.has(deviceId)) {
        markersRef.current.get(deviceId).setLatLng([lat, lng]).setIcon(icon);
      } else {
        const marker = L.marker([lat, lng], { icon }).addTo(mapInstance.current);
        marker.bindPopup(`
          <div style="font-family: sans-serif;">
            <strong>${deviceId}</strong><br/>
            Status: ${isFault ? "FAULT" : "HEALTHY"}<br/>
            Voltage: ${device.voltage ?? "—"}V<br/>
            Current: ${device.current ?? "—"}A
          </div>
        `);
        markersRef.current.set(deviceId, marker);
      }
    });
  }, [ready, telemetryByDevice]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-brand-500/20">
      <div ref={mapRef} className="w-full h-full min-h-[300px]" />
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
