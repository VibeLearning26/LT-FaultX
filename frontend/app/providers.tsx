"use client";

import { HardwareProvider } from "@/lib/hardware-context";
import { ReactNode } from "react";

const DEVICE_IDS = ["ESP32-POLE-01", "ESP32-POLE-02", "ESP32-POLE-03"];

export function Providers({ children }: { children: ReactNode }) {
  return (
    <HardwareProvider deviceIds={DEVICE_IDS} autoConnect={true}>
      {children}
    </HardwareProvider>
  );
}