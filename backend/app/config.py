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

    frontend_origins: str = "http://localhost:3000"
    hardware_mode: str = "simulation"  # "simulation" | "live"

    mqtt_host: str = "localhost"
    mqtt_port: int = 1883
    relay_ack_timeout: int = 10

    # ESP32 device authentication (API key for HTTP telemetry ingestion)
    device_api_key: str = "REPLACE_WITH_DEVICE_API_KEY"

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.frontend_origins.split(",") if o.strip()]

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
