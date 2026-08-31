"""Application configuration loaded from environment / .env.

The service-role key is server-only and must never be exposed to the browser.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    supabase_url: str = "https://sdfhhqyxuubcdmqjznor.supabase.co"
    supabase_service_role_key: str = "REPLACE_WITH_REAL_service_role_secret"

    # Next.js falls back to 3001 when 3000 is taken, so both are allowed by
    # default — otherwise every REST call fails CORS after a port fallback.
    frontend_origins: str = "http://localhost:3000,http://localhost:3001"
    hardware_mode: str = "simulation"  # "simulation" | "live"

    mqtt_host: str = "localhost"
    mqtt_port: int = 1883
    relay_ack_timeout: int = 10

    # ESP32 device authentication (API key for HTTP telemetry ingestion)
    device_api_key: str = "REPLACE_WITH_DEVICE_API_KEY"

    # Public base URL of this backend (used to build Exotel callback/voice URLs)
    base_url: str = "http://localhost:8000"

    # Exotel telephony (Indian cloud telephony for voice calls + SMS)
    exotel_api_key: str = ""
    exotel_api_token: str = ""
    exotel_account_sid: str = ""
    exotel_caller_id: str = ""

    # ------------------------------------------------------------------
    # Fault Simulator (software-only test harness on /simulator).
    # Location/topology values are configuration, never contact details.
    # Default site: Chelimparambu, Chemberi, Kannur district, PIN 670632.
    # ------------------------------------------------------------------
    simulator_device_id: str = "SIM_NODE_01"
    simulator_pole_label: str = "POLE-A -> POLE-B (SIM span)"
    simulator_latitude: float = 12.0006
    simulator_longitude: float = 75.5262
    simulator_pincode: str = "670632"
    simulator_area: str = "Chelimparambu, Chemberi, Kannur"
    # Spoken/SMS landmark, e.g. "the Chemberi junction". Optional.
    simulator_landmark: str = ""
    simulator_operator_id: str = "OP-01"
    simulator_operator_name: str = "Demo Operator"

    # Feeder ports on the simulated node: the primary carries load until a
    # fault, then the signal is rerouted to the backup port.
    simulator_port_primary: str = "PORT-1"
    simulator_port_backup: str = "PORT-2"

    # Contact numbers are intentionally EMPTY by default: they must be supplied
    # via environment/.env configuration. Nothing here is hardcoded.
    simulator_operator_phone: str = ""
    simulator_affected_user_phones: str = ""

    # Emergency service (shape mirrors the planned `emergency_services` table:
    # service_type / name / phone). Empty unless configured.
    emergency_service_type: str = "police"
    emergency_service_name: str = ""
    emergency_service_phone: str = ""

    # After the operator's fault call finishes, a second call to the SAME
    # operator number reports that the police station has been informed. The
    # delay gives the first call time to complete — Exotel will not connect a
    # second leg to a number that is still on the first one.
    police_followup_call_enabled: bool = True
    police_followup_delay_s: int = 45

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.frontend_origins.split(",") if o.strip()]

    @property
    def simulator_user_phones(self) -> list[str]:
        return [p.strip() for p in self.simulator_affected_user_phones.split(",") if p.strip()]

    @property
    def has_service_key(self) -> bool:
        """True only if a plausible service-role secret is configured."""
        key = self.supabase_service_role_key or ""
        if not key or key.startswith("REPLACE_WITH"):
            return False
        # Publishable keys start with sb_publishable_ and are NOT service-role.
        if key.startswith("sb_publishable_"):
            return False
        return True

    @property
    def is_simulation(self) -> bool:
        return self.hardware_mode.lower() != "live"


@lru_cache
def get_settings() -> Settings:
    return Settings()
