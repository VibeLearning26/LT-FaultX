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

interface HardwareContextValue {
  telemetry: ESP32Telemetry | null;
  deviceStatus: ESP32DeviceStatus | null;
  relayCommands: RelayCommandEvent[];
  connected: boolean;
  connect: (deviceId: string) => void;
  disconnect: () => void;
  sendRelayCommand: (deviceId: string, relay: "k1" | "k2", desiredState: boolean, issuedBy?: string) => Promise<void>;
  onTelemetry: (handler: TelemetryHandler) => () => void;
  onRelayCommand: (handler: RelayCommandHandler) => () => void;
}

const HardwareContext = createContext<HardwareContextValue | null>(null);

export function useHardware() {
  const ctx = useContext(HardwareContext);
  if (!ctx) {
    throw new Error("useHardware must be used within HardwareProvider");
  }
  return ctx;
}

interface HardwareProviderProps {
  children: React.ReactNode;
  deviceId?: string;
  autoConnect?: boolean;
}

const WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL || "ws://localhost:8000/ws/telemetry";
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export function HardwareProvider({ children, deviceId: initialDeviceId, autoConnect = true }: HardwareProviderProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const deviceIdRef = useRef(initialDeviceId);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const telemetryHandlers = useRef<Set<TelemetryHandler>>(new Set());
  const relayCommandHandlers = useRef<Set<RelayCommandHandler>>(new Set());
  
  const [telemetry, setTelemetry] = useState<ESP32Telemetry | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<ESP32DeviceStatus | null>(null);
  const [relayCommands, setRelayCommands] = useState<RelayCommandEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const broadcastTelemetry = useCallback((data: ESP32Telemetry) => {
    setTelemetry(data);
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

  const connect = useCallback((deviceId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (connecting) return;
    
    deviceIdRef.current = deviceId;
    setConnecting(true);
    
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      
      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
        console.log("[Hardware] WebSocket connected");
      };
      
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "telemetry") {
            broadcastTelemetry(msg.data);
          } else if (msg.type === "relay_command") {
            broadcastRelayCommand(msg.data);
          }
        } catch (e) {
          console.warn("[Hardware] Failed to parse WS message", e);
        }
      };
      
      ws.onclose = () => {
        setConnected(false);
        setConnecting(false);
        console.log("[Hardware] WebSocket disconnected");
        // Reconnect after 3s
        reconnectTimeoutRef.current = setTimeout(() => {
          if (deviceIdRef.current) {
            connect(deviceIdRef.current);
          }
        }, 3000);
      };
      
      ws.onerror = (err) => {
        console.error("[Hardware] WebSocket error", err);
      };
    } catch (e) {
      console.error("[Hardware] Failed to create WebSocket", e);
      setConnecting(false);
    }
  }, [connecting, broadcastTelemetry, broadcastRelayCommand]);

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

  // Auto-connect
  useEffect(() => {
    if (autoConnect && initialDeviceId) {
      connect(initialDeviceId);
    }
    return () => disconnect();
  }, [autoConnect, initialDeviceId, connect, disconnect]);

  // Fetch initial device status
  useEffect(() => {
    if (!initialDeviceId) return;
    let alive = true;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/api/devices/${initialDeviceId}/status`);
        if (res.ok && alive) {
          const data = await res.json();
          setDeviceStatus(data);
        }
      } catch (e) {
        console.warn("[Hardware] Failed to fetch device status", e);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => { alive = false; clearInterval(interval); };
  }, [initialDeviceId, API_URL]);

  return (
    <HardwareContext.Provider value={{
      telemetry,
      deviceStatus,
      relayCommands,
      connected,
      connect,
      disconnect,
      sendRelayCommand,
      onTelemetry,
      onRelayCommand,
    }}>
      {children}
    </HardwareContext.Provider>
  );
}