"""Supabase service client (service-role key, RLS-bypassing).

Lazily initialised so the app can boot for /health and simulation even before a
real service-role key is configured. Any DB call while the key is missing raises
a clear error instead of failing silently.
"""
from __future__ import annotations

from typing import Optional

from supabase import Client, create_client

from app.config import get_settings


class SupabaseUnavailable(RuntimeError):
    """Raised when a DB operation is attempted without a valid service key."""


_client: Optional[Client] = None


def get_client() -> Client:
    global _client
    settings = get_settings()
    if not settings.has_service_key:
        raise SupabaseUnavailable(
            "No valid SUPABASE_SERVICE_ROLE_KEY configured. Set the real "
            "service-role secret in backend/.env to enable live DB writes."
        )
    if _client is None:
        _client = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )
    return _client


def service_key_status() -> dict:
    settings = get_settings()
    return {
        "configured": settings.has_service_key,
        "supabase_url": settings.supabase_url,
    }


def resolve_device_uuid(device_ref: str) -> Optional[str]:
    """Map a hardware device_id (e.g. NODE_01) to its internal uuid, or return
    device_ref unchanged if it already looks like a uuid. Returns None if not found."""
    if _looks_like_uuid(device_ref):
        return device_ref
    client = get_client()
    res = (
        client.table("devices")
        .select("id")
        .eq("device_id", device_ref)
        .limit(1)
        .execute()
    )
    if res.data:
        return res.data[0]["id"]
    return None


def _looks_like_uuid(value: str) -> bool:
    return len(value) == 36 and value.count("-") == 4
