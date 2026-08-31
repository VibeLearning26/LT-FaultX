"use client";

import { useEffect, useRef, useState, useCallback, createContext, useContext } from "react";

export interface ESP32Telemetry {
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

export interface ESP32DeviceStatus {
  device_id: string;
  online: boolean;
  last_seen: string | null;
  voltage: number | null;
  current: number | null;
  line_status: string | null;
  relay_state: boolean | null;
  fault: boolean;
  comm: string;
  firmware_version: string | null;
  wifi_rssi: number | null;
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

type TelemetryHandler = (data: ESP32Telemetry) => void;
type RelayCommandHandler = (data: RelayCommandEvent) => void;
/** Generic handler for any other broadcast event type (e.g. "simulator"). */
type EventHandler = (data: any) => void;

interface HardwareContextValue {
  telemetryByDevice: Record<string, ESP32Telemetry>;
  statusByDevice: Record<string, ESP32DeviceStatus>;
  relayCommands: RelayCommandEvent[];
  connected: boolean;
  connectionError: string | null;
  connect: () => void;
  disconnect: () => void;
  sendRelayCommand: (deviceId: string, relay: "k1" | "k2", desiredState: boolean, issuedBy?: string) => Promise<void>;
  onTelemetry: (handler: TelemetryHandler) => () => void;
  onRelayCommand: (handler: RelayCommandHandler) => () => void;
  /** Subscribe to any other event type broadcast on the same socket. */
  onEvent: (type: string, handler: EventHandler) => () => void;
}

const HardwareContext = createContext<HardwareContextValue | null>(null);

export function useHardware() {
  const ctx = useContext(HardwareContext);
  if (!ctx) {
    throw new Error("useHardware must be used within HardwareProvider");
  }
  return ctx;
}

/** Helper to get the latest telemetry/status for a specific device. */
export function useDevice(deviceId: string) {
  const { telemetryByDevice, statusByDevice } = useHardware();
  const telemetry = telemetryByDevice[deviceId] ?? null;
  const deviceStatus = statusByDevice[deviceId] ?? null;
  return { telemetry, deviceStatus };
}

interface HardwareProviderProps {
  children: React.ReactNode;
  deviceIds?: string[];
  autoConnect?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

/**
 * WebSocket URL, derived from the HTTP base when the explicit WS var is unset.
 *
 * Without this a deployed frontend silently dials ws://localhost:8000 — and an
 * https page cannot open an insecure ws:// socket at all, so https must map to
 * wss automatically.
 */
const WS_URL =
  process.env.NEXT_PUBLIC_BACKEND_WS_URL ||
  `${API_URL.replace(/^http/, "ws").replace(/\/$/, "")}/ws/telemetry`;

/** Reconnect backoff: 1s, 2s, 4s, 8s, capped at 15s. */
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15000;

export function HardwareProvider({ children, deviceIds: initialDeviceIds, autoConnect = true }: HardwareProviderProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const telemetryHandlers = useRef<Set<TelemetryHandler>>(new Set());
  const relayCommandHandlers = useRef<Set<RelayCommandHandler>>(new Set());
  const eventHandlers = useRef<Map<string, Set<EventHandler>>>(new Map());
  /** True while we are deliberately tearing down, so onclose skips reconnect. */
  const intentionalCloseRef = useRef(false);
  /** Guards against overlapping connect() calls without needing state. */
  const connectingRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  
  const [telemetryByDevice, setTelemetryByDevice] = useState<Record<string, ESP32Telemetry>>({});
  const [statusByDevice, setStatusByDevice] = useState<Record<string, ESP32DeviceStatus>>({});
  const [relayCommands, setRelayCommands] = useState<RelayCommandEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const broadcastTelemetry = useCallback((data: ESP32Telemetry) => {
    setTelemetryByDevice(prev => ({ ...prev, [data.device_id]: data }));
    telemetryHandlers.current.forEach(h => h(data));
  }, []);

  const broadcastRelayCommand = useCallback((data: RelayCommandEvent) => {
    setRelayCommands(prev => {
      const idx = prev.findIndex(c => c.id === data.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = data;
        return next;
      }
      return [data, ...prev].slice(0, 50);
    });
    relayCommandHandlers.current.forEach(h => h(data));
  }, []);

  // Held in a ref so onclose can trigger a reconnect without connect()
  // depending on itself (which would recreate the callback every render).
  const connectRef = useRef<() => void>(() => {});

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (connectingRef.current) return;

    connectingRef.current = true;
    intentionalCloseRef.current = false;
    setConnecting(true);

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        connectingRef.current = false;
        reconnectAttemptsRef.current = 0;
        setConnected(true);
        setConnecting(false);
        setConnectionError(null);
        console.log("[Hardware] WebSocket connected to", WS_URL);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "telemetry") {
            broadcastTelemetry(msg.data);
          } else if (msg.type === "relay_command") {
            broadcastRelayCommand(msg.data);
          }
          // Fan out to generic subscribers (e.g. the fault simulator).
          eventHandlers.current.get(msg.type)?.forEach(h => h(msg.data));
        } catch (e) {
          console.warn("[Hardware] Failed to parse WS message", e);
        }
      };

      ws.onclose = () => {
        connectingRef.current = false;
        setConnected(false);
        setConnecting(false);
        // A deliberate disconnect (or a StrictMode remount) must not schedule
        // a reconnect, otherwise sockets pile up.
        if (intentionalCloseRef.current) return;

        const attempt = reconnectAttemptsRef.current++;
        const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
        reconnectTimeoutRef.current = setTimeout(() => connectRef.current(), delay);
      };

      ws.onerror = () => {
        // The error Event carries no diagnostic detail, and console.error here
        // would surface as a blocking Next.js dev overlay on every retry. The
        // failure is already reported to the UI through connectionError.
        connectingRef.current = false;
        setConnectionError(
          `Cannot reach the FaultX backend at ${WS_URL}. Start it with: uvicorn app.main:app --reload`,
        );
        console.warn("[Hardware] WebSocket unavailable at", WS_URL);
      };
    } catch (e) {
      connectingRef.current = false;
      setConnecting(false);
      console.warn("[Hardware] Failed to create WebSocket", e);
    }
  }, [broadcastTelemetry, broadcastRelayCommand]);

  connectRef.current = connect;

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      // Drop handlers before closing so the in-flight close event cannot
      // schedule a reconnect after we have cleared the timer.
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    connectingRef.current = false;
    setConnected(false);
    setConnecting(false);
  }, []);

  const sendRelayCommand = useCallback(async (deviceId: string, relay: "k1" | "k2", desiredState: boolean, issuedBy?: string) => {
    const res = await fetch(`${API_URL}/api/relay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId, relay, desired_state: desiredState, issued_by: issuedBy }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to send relay command");
    }
  }, []);

  const onTelemetry = useCallback((handler: TelemetryHandler) => {
    telemetryHandlers.current.add(handler);
    return () => telemetryHandlers.current.delete(handler);
  }, []);

  const onRelayCommand = useCallback((handler: RelayCommandHandler) => {
    relayCommandHandlers.current.add(handler);
    return () => relayCommandHandlers.current.delete(handler);
  }, []);

  const onEvent = useCallback((type: string, handler: EventHandler) => {
    const set = eventHandlers.current.get(type) ?? new Set<EventHandler>();
    set.add(handler);
    eventHandlers.current.set(type, set);
    return () => {
      set.delete(handler);
      if (set.size === 0) eventHandlers.current.delete(type);
    };
  }, []);

  // Auto-connect
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => disconnect();
  }, [autoConnect, connect, disconnect]);

  // Fetch initial device status and keep polling
  useEffect(() => {
    const ids = initialDeviceIds ?? [];
    if (ids.length === 0) return;
    let alive = true;
    const fetchStatus = async () => {
      for (const id of ids) {
        try {
          const res = await fetch(`${API_URL}/api/devices/${id}/status`);
          if (res.ok && alive) {
            const data = await res.json();
            setStatusByDevice(prev => ({ ...prev, [data.device_id]: data }));
          }
        } catch (e) {
          console.warn(`[Hardware] Failed to fetch status for ${id}`, e);
        }
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => { alive = false; clearInterval(interval); };
  }, [initialDeviceIds, API_URL]);

  return (
    <HardwareContext.Provider value={{
      telemetryByDevice,
      statusByDevice,
      relayCommands,
      connected,
      connectionError,
      connect,
      disconnect,
      sendRelayCommand,
      onTelemetry,
      onRelayCommand,
      onEvent,
    }}>
      {children}
    </HardwareContext.Provider>
  );
}