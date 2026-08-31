"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface TelemetryData {
  device_id: string;
  voltage: number | null;
  current: number | null;
  power: number | null;
  relay_k1: boolean | null;
  relay_k2: boolean | null;
  fault: boolean;
  line_status: string | null;
  wifi_rssi: number | null;
  reading_at: string;
  persisted: boolean;
}

export interface RelayCommandEvent {
  id: string;
  device_id: string;
  device_ref: string;
  relay: string;
  desired_state: boolean;
  status: "PENDING" | "SENT" | "ACKED" | "FAILED" | "TIMEOUT";
  issued_at: string;
  sent_at?: string;
  acked_at?: string;
  ack_state?: boolean;
  error?: string;
  persisted?: boolean;
}

/**
 * WebSocket URL.
 *
 * Derived from NEXT_PUBLIC_BACKEND_URL when the explicit WS var is unset, so a
 * deployed frontend never silently falls back to ws://localhost:8000 — and so
 * an https backend gets wss (a browser blocks insecure ws from an https page).
 */
function resolveWsUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_BACKEND_WS_URL;
  if (explicit) return explicit;
  const http = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (http) return `${http.replace(/^http/, "ws").replace(/\/$/, "")}/ws/telemetry`;
  return "ws://localhost:8000/ws/telemetry";
}

const WS_URL = resolveWsUrl();

export function useHardwareWebSocket(deviceId?: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [relayCommands, setRelayCommands] = useState<RelayCommandEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(() => {
    if (!deviceId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (connecting) return;

    setConnecting(true);
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "telemetry") {
            setTelemetry(msg.data);
          } else if (msg.type === "relay_command") {
            setRelayCommands(prev => {
              const idx = prev.findIndex(c => c.id === msg.data.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = msg.data;
                return next;
              }
              return [msg.data, ...prev].slice(0, 50);
            });
          }
        } catch (e) {
          console.warn("[useHardwareWebSocket] Failed to parse message", e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setConnecting(false);
        reconnectTimeoutRef.current = setTimeout(() => connect(), 3000);
      };

      ws.onerror = (err) => {
        console.error("[useHardwareWebSocket] Error", err);
      };
    } catch (e) {
      console.error("[useHardwareWebSocket] Failed to create WebSocket", e);
      setConnecting(false);
    }
  }, [deviceId, connecting]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  useEffect(() => {
    if (deviceId) connect();
    return () => disconnect();
  }, [deviceId, connect, disconnect]);

  return { telemetry, relayCommands, connected, connecting, connect, disconnect };
}