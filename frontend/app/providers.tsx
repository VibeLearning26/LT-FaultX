"use client";

import { HardwareProvider } from "@/lib/hardware-context";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <HardwareProvider deviceId="ESP32-POLE-01" autoConnect={true}>
      {children}
    </HardwareProvider>
  );
}