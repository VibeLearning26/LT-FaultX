"""Create the three demo auth users in Supabase Auth via the service role.

Usage:
    cd backend
    python scripts/seed_users.py

Requires a REAL service-role secret in backend/.env (SUPABASE_SERVICE_ROLE_KEY).
The on_auth_user_created trigger (migration 0001) reads raw_user_meta_data.role
to populate profiles.role, so the role must be passed in user_metadata here.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Allow running as a script: add backend/ to sys.path.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings  # noqa: E402
from app.services.supabase_service import get_client  # noqa: E402

DEMO_USERS = [
    {
        "email": "citizen@demo.local",
        "password": "Demo@User123",
        "role": "citizen",
        "full_name": "Demo Citizen",
    },
    {
        "email": "operator@demo.local",
        "password": "Demo@Operator123",
        "role": "operator",
        "full_name": "Demo Operator",
    },
    {
        "email": "admin@demo.local",
        "password": "Demo@Admin123",
        "role": "admin",
        "full_name": "Demo Administrator",
    },
]


def main() -> int:
    settings = get_settings()
    if not settings.has_service_key:
        print(
            "ERROR: No valid SUPABASE_SERVICE_ROLE_KEY in backend/.env.\n"
            "Set the real service-role secret before running this script.",
            file=sys.stderr,
        )
        return 1

    client = get_client()
    for u in DEMO_USERS:
        try:
            client.auth.admin.create_user(
                {
                    "email": u["email"],
                    "password": u["password"],
                    "email_confirm": True,
                    "user_metadata": {"role": u["role"], "full_name": u["full_name"]},
                }
            )
            print(f"created {u['email']} ({u['role']})")
        except Exception as exc:  # already exists / other
            print(f"skip {u['email']}: {exc}")
    print("Done. Verify roles in the profiles table.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
