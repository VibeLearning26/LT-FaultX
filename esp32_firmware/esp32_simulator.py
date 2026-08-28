#!/usr/bin/env python3
"""
ESP32 Telemetry Simulator for LT-FaultX

Simulates an ESP32 device sending telemetry to the backend and polling for commands.
Use this to test the full ESP32 -> backend -> frontend pipeline without physical hardware.

Usage:
    python esp32_simulator.py --device-id ESP32-POLE-01 --api-key YOUR_API_KEY --backend http://localhost:8000
"""

import asyncio
import argparse
import json
import random
import time
from datetime import datetime, timezone
from typing import Optional

import httpx


class ESP32Simulator:
    def __init__(
        self,
        device_id: str,
        api_key: str,
        backend_url: str,
        telemetry_interval: float = 1.0,
        command_poll_interval: float = 2.0,
    ):
        self.device_id = device_id
        self.api_key = api_key
        self.backend_url = backend_url.rstrip("/")
        self.telemetry_interval = telemetry_interval
        self.command_poll_interval = command_poll_interval
        
        # Simulated sensor state
        self.voltage = 12.0
        self.current = 0.5
        self.relay_state = True
        self.line_state = "HEALTHY"
        self.fault_confirmed = False
        self.fault_start_time: Optional[float] = None
        self.sequence = 0
        self.boot_time = time.time()
        
        # Config (matching firmware defaults)
        self.min_voltage = 10.0
        self.max_voltage = 28.0
        self.min_current = 0.05
        self.fault_confirm_delay = 2.0
        self.auto_isolation = True
        
        self.client = httpx.AsyncClient(timeout=10.0)
        self.running = False

    async def send_telemetry(self):
        """Send telemetry to backend."""
        # Simulate sensor variations
        self.voltage += random.uniform(-0.2, 0.2)
        self.current += random.uniform(-0.05, 0.05)
        self.voltage = max(0, min(30, self.voltage))
        self.current = max(0, min(10, self.current))
        
        # Evaluate line state (matching firmware logic)
        voltage_ok = self.min_voltage <= self.voltage <= self.max_voltage
        current_ok = self.current >= self.min_current
        
        if self.relay_state and voltage_ok and current_ok:
            new_state = "HEALTHY"
        elif not self.relay_state:
            new_state = "ISOLATED"
        else:
            new_state = "FAULT"
        
        # Fault confirmation with delay
        now = time.time()
        if new_state == "FAULT":
            if self.fault_start_time is None:
                self.fault_start_time = now
            elif now - self.fault_start_time >= self.fault_confirm_delay:
                self.fault_confirmed = True
                if self.auto_isolation and self.relay_state:
                    print(f"[{self.device_id}] AUTO-ISOLATION: Opening relay due to confirmed fault")
                    self.relay_state = False
                    self.line_state = "ISOLATED"
        else:
            self.fault_start_time = None
            self.fault_confirmed = False
        
        if new_state != "FAULT" or not self.fault_confirmed:
            self.line_state = new_state
        
        payload = {
            "device_id": self.device_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "voltage_post_2": round(self.voltage, 2),
            "current": round(self.current, 2),
            "line_status": self.line_state,
            "relay_state": self.relay_state,
            "green_led": self.line_state == "HEALTHY",
            "red_led": self.line_state in ("FAULT", "ISOLATED"),
            "buzzer": self.line_state == "FAULT",
            "load_1": self.relay_state,
            "load_2": self.relay_state,
            "wifi_rssi": random.randint(-70, -45),
            "uptime_seconds": int(time.time() - self.boot_time),
            "firmware_version": "1.0.0-sim",
            "sequence_number": self.sequence,
        }
        self.sequence += 1
        
        try:
            response = await self.client.post(
                f"{self.backend_url}/api/devices/{self.device_id}/telemetry",
                json=payload,
                headers={"X-Device-API-Key": self.api_key, "Content-Type": "application/json"},
            )
            if response.status_code in (200, 201):
                print(f"[{self.device_id}] Telemetry sent: V={self.voltage:.1f}V I={self.current:.2f}A State={self.line_state} Relay={'CLOSED' if self.relay_state else 'OPEN'}")
            else:
                print(f"[{self.device_id}] Telemetry failed: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"[{self.device_id}] Telemetry error: {e}")

    async def poll_commands(self):
        """Poll for commands from backend."""
        try:
            response = await self.client.get(
                f"{self.backend_url}/api/devices/{self.device_id}/command",
                headers={"X-Device-API-Key": self.api_key},
            )
            
            if response.status_code == 204:
                return  # No commands
            elif response.status_code == 200:
                cmd = response.json()
                await self.execute_command(cmd)
            else:
                print(f"[{self.device_id}] Command poll failed: {response.status_code}")
        except Exception as e:
            print(f"[{self.device_id}] Command poll error: {e}")

    async def execute_command(self, cmd: dict):
        """Execute a command and acknowledge."""
        command_id = cmd.get("command_id", "")
        command = cmd.get("command", "")
        params = cmd.get("parameters", {})
        
        print(f"[{self.device_id}] Received command: {command} ({command_id})")
        
        success = False
        result_state = None
        message = ""
        
        if command == "OPEN_RELAY":
            self.relay_state = False
            success = True
            result_state = False
            message = "Relay opened"
        elif command == "CLOSE_RELAY":
            self.relay_state = True
            success = True
            result_state = True
            message = "Relay closed"
        elif command == "RESET_FAULT":
            self.fault_confirmed = False
            self.fault_start_time = None
            success = True
            result_state = None
            message = "Fault reset"
        elif command == "REQUEST_STATUS":
            success = True
            result_state = self.relay_state
            message = "Status sent"
        else:
            message = f"Unknown command: {command}"
        
        # Acknowledge
        await self.acknowledge_command(command_id, "ACKNOWLEDGED" if success else "FAILED", result_state, message)

    async def acknowledge_command(self, command_id: str, status: str, result_state: Optional[bool], message: str):
        """Send command acknowledgement."""
        try:
            await self.client.post(
                f"{self.backend_url}/api/devices/{self.device_id}/command/{command_id}/ack",
                json={
                    "command_id": command_id,
                    "status": status,
                    "result_state": result_state,
                    "message": message,
                },
                headers={"X-Device-API-Key": self.api_key, "Content-Type": "application/json"},
            )
            print(f"[{self.device_id}] Command {command_id} acknowledged: {status}")
        except Exception as e:
            print(f"[{self.device_id}] Command ack error: {e}")

    async def run(self):
        """Main simulation loop."""
        self.running = True
        last_telemetry = 0
        last_command_poll = 0
        
        print(f"[{self.device_id}] Starting ESP32 simulator")
        print(f"[{self.device_id}] Backend: {self.backend_url}")
        print(f"[{self.device_id}] Telemetry interval: {self.telemetry_interval}s")
        print(f"[{self.device_id}] Command poll interval: {self.command_poll_interval}s")
        
        try:
            while self.running:
                now = time.time()
                
                if now - last_telemetry >= self.telemetry_interval:
                    await self.send_telemetry()
                    last_telemetry = now
                
                if now - last_command_poll >= self.command_poll_interval:
                    await self.poll_commands()
                    last_command_poll = now
                
                await asyncio.sleep(0.1)
        except KeyboardInterrupt:
            print(f"\n[{self.device_id}] Shutting down...")
        finally:
            await self.client.aclose()

    def stop(self):
        self.running = False


async def main():
    parser = argparse.ArgumentParser(description="ESP32 Telemetry Simulator for LT-FaultX")
    parser.add_argument("--device-id", required=True, help="Device ID (e.g., ESP32-POLE-01)")
    parser.add_argument("--api-key", required=True, help="Device API key (must match backend)")
    parser.add_argument("--backend", default="http://localhost:8000", help="Backend base URL")
    parser.add_argument("--telemetry-interval", type=float, default=1.0, help="Telemetry interval (seconds)")
    parser.add_argument("--command-poll-interval", type=float, default=2.0, help="Command poll interval (seconds)")
    args = parser.parse_args()
    
    simulator = ESP32Simulator(
        device_id=args.device_id,
        api_key=args.api_key,
        backend_url=args.backend,
        telemetry_interval=args.telemetry_interval,
        command_poll_interval=args.command_poll_interval,
    )
    
    await simulator.run()


if __name__ == "__main__":
    asyncio.run(main())