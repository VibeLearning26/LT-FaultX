# FaultX v2.0 — Technical Specification

**Document Version:** 1.0
**Date:** 2026-08-30
**Author:** System Architect
**Status:** Draft — Pending Authorization Review

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FAULTX v2.0                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐               │
│  │  ESP32   │    │  Line    │    │  Citizen │    │  Admin   │               │
│  │ Sensors  │    │  Map UI  │    │  Portal  │    │  Panel   │               │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘               │
│       │               │               │               │                      │
│       └───────────────┴───────┬───────┴───────────────┘                      │
│                               │                                              │
│                    ┌──────────▼──────────┐                                   │
│                    │   FastAPI Backend   │                                   │
│                    │   (Python 3.11+)    │                                   │
│                    └──────────┬──────────┘                                   │
│                               │                                              │
│         ┌─────────────────────┼─────────────────────┐                        │
│         │                     │                     │                        │
│  ┌──────▼──────┐    ┌─────────▼─────────┐   ┌──────▼──────┐                │
│  │  Supabase   │    │   WebSocket Hub   │   │   Twilio    │                │
│  │  (Postgres) │    │   (Real-time)     │   │   API       │                │
│  └─────────────┘    └───────────────────┘   └─────────────┘                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema

### 2.1 New Tables

```sql
-- ============================================================
-- NOTIFICATION SYSTEM
-- ============================================================

CREATE TYPE notification_type AS ENUM ('sms', 'call', 'push', 'email');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'failed');

CREATE TABLE notifications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id         UUID REFERENCES fault_events(id) ON DELETE CASCADE,
    recipient_type      TEXT NOT NULL CHECK (recipient_type IN ('operator', 'citizen', 'admin')),
    recipient_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
    recipient_phone     TEXT NOT NULL,
    type                notification_type NOT NULL,
    status              notification_status NOT NULL DEFAULT 'pending',
    message             TEXT NOT NULL,
    twilio_sid          TEXT,
    sent_at             TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ,
    error               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_incident ON notifications(incident_id);
CREATE INDEX idx_notifications_status ON notifications(status);

-- ============================================================
-- OPERATOR TASKS & SLA MANAGEMENT
-- ============================================================

CREATE TYPE task_status AS ENUM ('assigned', 'in_progress', 'completed', 'verified', 'overdue');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE operator_tasks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id         UUID REFERENCES fault_events(id) ON DELETE CASCADE,
    operator_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status              task_status NOT NULL DEFAULT 'assigned',
    priority            task_priority NOT NULL DEFAULT 'high',
    title               TEXT NOT NULL,
    description         TEXT,
    sla_deadline        TIMESTAMPTZ NOT NULL,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    verified_at         TIMESTAMPTZ,
    verified_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
    completion_notes    TEXT,
    completion_photo_url TEXT,
    estimated_duration  INTEGER,  -- minutes
    actual_duration     INTEGER,  -- minutes
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_operator ON operator_tasks(operator_id);
CREATE INDEX idx_tasks_status ON operator_tasks(status);
CREATE INDEX idx_tasks_sla ON operator_tasks(sla_deadline);

-- ============================================================
-- EMERGENCY SERVICES (Police, Fire, etc.)
-- ============================================================

CREATE TABLE emergency_services (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type        TEXT NOT NULL CHECK (service_type IN ('police', 'fire', 'medical', 'disaster')),
    name                TEXT NOT NULL,
    phone               TEXT NOT NULL,
    alternate_phone     TEXT,
    email               TEXT,
    address             TEXT,
    pincode             TEXT NOT NULL,
    latitude            DOUBLE PRECISION,
    longitude           DOUBLE PRECISION,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_emergency_pincode ON emergency_services(pincode);
CREATE INDEX idx_emergency_type ON emergency_services(service_type);

-- ============================================================
-- ROAD BLOCKADE REQUESTS
-- ============================================================

CREATE TYPE blockade_status AS ENUM ('requested', 'approved', 'active', 'lifted', 'rejected');

CREATE TABLE road_blockades (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id         UUID REFERENCES fault_events(id) ON DELETE CASCADE,
    requested_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
    pincode             TEXT NOT NULL,
    location_desc       TEXT NOT NULL,
    latitude            DOUBLE PRECISION,
    longitude           DOUBLE PRECISION,
    status              blockade_status NOT NULL DEFAULT 'requested',
    police_ref          TEXT,
    requested_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at         TIMESTAMPTZ,
    lifted_at           TIMESTAMPTZ,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blockade_incident ON road_blockades(incident_id);
CREATE INDEX idx_blockade_status ON road_blockades(status);

-- ============================================================
-- OPERATOR AVAILABILITY & DISPATCH
-- ============================================================

CREATE TABLE operator_availability (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
    is_available        BOOLEAN NOT NULL DEFAULT true,
    current_task_id     UUID REFERENCES operator_tasks(id) ON DELETE SET NULL,
    shift_start         TIME,
    shift_end           TIME,
    phone               TEXT NOT NULL,
    last_heartbeat      TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_availability_operator ON operator_availability(operator_id);
CREATE INDEX idx_availability_available ON operator_availability(is_available) WHERE is_available = true;
```

### 2.2 Modified Tables

```sql
-- Add geospatial columns to fault_events
ALTER TABLE fault_events
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS pincode TEXT,
    ADD COLUMN IF NOT EXISTS location_desc TEXT,
    ADD COLUMN IF NOT EXISTS wire_id TEXT,
    ADD COLUMN IF NOT EXISTS operator_task_id UUID REFERENCES operator_tasks(id);

-- Add notification preferences to profiles
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS notify_sms BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS notify_call BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS pincode TEXT;

-- Add completion tracking to device_status
ALTER TABLE device_status
    ADD COLUMN IF NOT EXISTS last_fault_id UUID REFERENCES fault_events(id),
    ADD COLUMN IF NOT EXISTS last_operator_id UUID REFERENCES profiles(id);
```

---

## 3. API Endpoint Scheme

### 3.1 Notification & Telephony

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/notifications/send` | Admin | Send SMS to multiple recipients |
| `POST` | `/api/notifications/call` | Admin | Trigger Twilio voice call to operator |
| `GET` | `/api/notifications` | Admin | List all notification logs |
| `GET` | `/api/notifications/incident/:id` | Operator | Get notifications for incident |
| `POST` | `/api/twilio/callback` | Public | Twilio delivery status webhook |
| `POST` | `/api/twilio/voice` | Public | Twilio voice call webhook (TwiML) |

### 3.2 Geospatial & Dispatch

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/incidents/plot` | System | Auto-plot incident on map |
| `GET`  | `/api/incidents/nearby` | Citizen | Find incidents near PIN code |
| `GET`  | `/api/emergency-services` | Citizen | List nearby emergency services |
| `POST` | `/api/blockades` | Operator | Request road blockade |
| `GET`  | `/api/blockades` | Operator | List blockade requests |
| `PATCH`| `/api/blockades/:id` | Admin | Update blockade status |

### 3.3 Operator Tasks & SLA

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/tasks` | Admin | Create and assign task |
| `GET`  | `/api/tasks` | Operator | List operator's tasks |
| `GET`  | `/api/tasks/:id` | Operator | Get task details |
| `PATCH`| `/api/tasks/:id/start` | Operator | Mark task in-progress |
| `PATCH`| `/api/tasks/:id/complete` | Operator | Submit completion report |
| `PATCH`| `/api/tasks/:id/verify` | Admin | Verify and close task |
| `GET`  | `/api/tasks/overdue` | Admin | List overdue tasks |
| `GET`  | `/api/operators/available` | System | Get available operators |

### 3.4 Incident Lifecycle

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/incidents` | System | Create new incident |
| `GET`  | `/api/incidents` | Operator | List active incidents |
| `GET`  | `/api/incidents/:id` | Any | Get incident details |
| `PATCH`| `/api/incidents/:id/acknowledge` | Operator | Acknowledge incident |
| `PATCH`| `/api/incidents/:id/isolate` | Operator | Isolate line (relay off) |
| `PATCH`| `/api/incidents/:id/restore` | Operator | Restore line (relay on) |
| `PATCH`| `/api/incidents/:id/resolve` | Admin | Final resolution |
| `GET`  | `/api/incidents/:id/history` | Any | Full audit trail |

---

## 4. Workflow Diagrams

### 4.1 Automated Alert Workflow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  ESP32      │     │  Backend     │     │   Twilio API    │
│  Fault      │────▶│  detect_fault│────▶│                 │
│  Detected   │     │              │     │                 │
└─────────────┘     └──────┬───────┘     │                 │
                           │             │  ┌───────────┐  │
                           ├─────────────│─▶│ Voice Call│  │
                           │             │  │ Operator  │  │
                           │             │  └───────────┘  │
                           │             │                 │
                           │             │  ┌───────────┐  │
                           ├─────────────│─▶│ SMS       │  │
                           │             │  │ Citizens  │  │
                           │             │  └───────────┘  │
                           │             │                 │
                           │             │  ┌───────────┐  │
                           └─────────────│─▶│ SMS       │  │
                                         │  │ Operator  │  │
                                         │  └───────────┘  │
                                         └─────────────────┘
```

**Step-by-step:**

1. ESP32 detects fault → POST `/api/devices/{id}/telemetry` with `fault: true`
2. Backend `ingest_telemetry()` creates `fault_events` row with `status: ACTIVE`
3. System identifies device location (pincode, lat/lng)
4. NotificationService queries `operator_availability` for on-duty operator
5. Twilio voice call initiated to operator phone
6. SMS dispatched simultaneously to:
   - Assigned operator
   - All citizens with matching pincode in `profiles`
7. All notifications logged to `notifications` table
8. Real-time broadcast via WebSocket to all connected frontend clients
9. Map indicator updates to RED at incident coordinates

### 4.2 Operator Task Assignment & SLA

```
┌─────────┐    ┌────────────┐    ┌────────────┐    ┌──────────┐
│  Admin  │───▶│ Create Task│───▶│ Assign to  │───▶│ Operator │
│         │    │            │    │ Operator   │    │ Notified │
└─────────┘    └────────────┘    └────────────┘    └────┬─────┘
                                                         │
                                                         ▼
┌─────────┐    ┌────────────┐    ┌────────────┐    ┌──────────┐
│  Admin  │◀───│ Verify &   │◀───│ Submit    │◀───│ Operator │
│         │    │ Close      │    │ Completion│    │ Working  │
└─────────┘    └────────────┘    └────────────┘    └──────────┘
```

**Step-by-step:**

1. Admin creates `operator_tasks` with `sla_deadline` and `priority`
2. System dispatches SMS + push notification to assigned operator
3. Operator sees task in `/operator/tasks` dashboard
4. Operator taps "Start Task" → `status: in_progress`, `started_at: now()`
5. SLA countdown begins (visible on admin dashboard)
6. If `sla_deadline` passes → `status: overdue`, escalation alert to admin
7. Operator completes physical repair → taps "Complete"
8. Operator submits completion report (notes + photo URL)
9. `status: completed`, `completed_at: now()`
10. Admin reviews → taps "Verify" → `status: verified`
11. System triggers incident resolution workflow

### 4.3 Incident Resolution & Signal Restoration

```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│  Operator  │───▶│  Complete  │───▶│  Admin     │───▶│  Signal    │
│  Repair    │    │  Report    │    │  Verify    │    │  Restore   │
│  Done      │    │  Submitted │    │  Approved  │    │            │
└────────────┘    └────────────┘    └────────────┘    └─────┬──────┘
                                                             │
                                                             ▼
                                                    ┌────────────────┐
                                                    │  Map updates   │
                                                    │  GREEN signal  │
                                                    │  Incident      │
                                                    │  CLOSED        │
                                                    └────────────────┘
```

**Step-by-step:**

1. Operator completes physical repair in the field
2. Operator opens app → `/operator/tasks/{id}/complete`
3. Submits completion report:
   - `completion_notes`: Free text description
   - `completion_photo_url`: Uploaded photo of repair
   - `actual_duration`: Time taken in minutes
4. Task `status` → `completed`
5. Admin receives notification → reviews completion report
6. Admin taps "Verify" → task `status` → `verified`, `verified_at: now()`
7. System triggers relay restore:
   - POST `/api/devices/{id}/command` with `command: CLOSE_RELAY`
   - ESP32 acknowledges → relay closes → line energized
8. ESP32 telemetry reports `fault: false`, `line_status: HEALTHY`
9. Backend updates `fault_events` → `status: RESTORED`, `cleared_at: now()`
10. WebSocket broadcast → all frontend clients update
11. Map indicator at incident coordinates → GREEN
12. SMS notification dispatched to affected citizens: "Power restored"

### 4.4 Road Blockade Request Flow

```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│  Operator  │───▶│  Request   │───▶│  Police    │───▶│  Blockade  │
│  Requests  │    │  Created   │    │  Approves  │    │  Active    │
│  Blockade  │    │            │    │            │    │            │
└────────────┘    └────────────┘    └────────────┘    └────────────┘
                                                             │
                                                    ┌────────▼────────┐
                                                    │  Citizens see   │
                                                    │  blockade on    │
                                                    │  map + alerts   │
                                                    └─────────────────┘
```

---

## 5. Integration Patterns

### 5.1 Exotel Voice Call & SMS (Operator Alert)

```python
# backend/app/services/exotel_service.py

import httpx
from app.config import get_settings

class ExotelService:
    def __init__(self):
        settings = get_settings()
        self.api_key = settings.exotel_api_key
        self.api_token = settings.exotel_api_token
        self.account_sid = settings.exotel_account_sid
        self.caller_id = settings.exotel_caller_id
        self.base_url = f"https://{self.api_key}:{self.api_token}@api.exotel.com/v1/Accounts/{self.account_sid}"

    async def make_call(self, to_number: str, incident_id: str) -> str:
        """Initiate voice call to operator with incident details."""
        # Exotel uses TwiML-like XML or direct URL for call flow
        # For simple alerts, use Exotel's "Connect" API with a voice URL
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/Calls/connect",
                data={
                    "From": self.caller_id,
                    "To": to_number,
                    "CallerId": self.caller_id,
                    "CallType": "trans",
                    # URL that returns Exotel TwiML for voice message
                    "Url": f"{settings.base_url}/api/exotel/voice-xml?incident={incident_id}",
                    "StatusCallback": f"{settings.base_url}/api/exotel/callback",
                }
            )
            response.raise_for_status()
            data = response.json()
            return data["Call"]["Sid"]

    async def send_sms(self, to_number: str, message: str) -> str:
        """Send SMS notification via Exotel."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/Sms/send",
                data={
                    "From": self.caller_id,
                    "To": to_number,
                    "Body": message,
                    "Priority": "high",
                    "StatusCallback": f"{settings.base_url}/api/exotel/callback",
                }
            )
            response.raise_for_status()
            data = response.json()
            return data["SMSMessage"]["Sid"]

    def get_voice_xml(self, incident_id: str) -> str:
        """Generate Exotel TwiML for voice call message."""
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="woman" language="en-IN">
        Incident alert from Fault X. A fault has been detected at location {incident_id}.
        Please check the Fault X dashboard immediately. Repeat. Fault detected at {incident_id}.
    </Say>
    <Hangup/>
</Response>"""
```

### 5.2 Exotel API Endpoints (Backend)

```python
# backend/app/api/exotel_routes.py

from fastapi import APIRouter, Request
from app.services.exotel_service import ExotelService

router = APIRouter(prefix="/api/exotel", tags=["exotel"])
exotel = ExotelService()

@router.get("/voice-xml")
async def get_voice_xml(incident: str):
    """Return Exotel TwiML for voice call."""
    from fastapi.responses import Response
    xml = exotel.get_voice_xml(incident)
    return Response(content=xml, media_type="application/xml")

@router.post("/callback")
async def exotel_callback(request: Request):
    """Handle Exotel call/SMS status callbacks."""
    data = await request.json()
    # Update notification status in database
    # data contains: CallSid, Status, Direction, etc.
    return {"status": "ok"}
```

### 5.2 WebSocket Real-time Broadcast

```python
# backend/app/ws/hub.py (existing, extended)

class ConnectionHub:
    async def broadcast_incident(self, incident_data: dict):
        """Broadcast incident update to all connected clients."""
        await self.broadcast({
            "type": "incident_update",
            "data": incident_data
        })

    async def broadcast_task_update(self, task_data: dict):
        """Broadcast task status change to relevant operator."""
        await self.broadcast({
            "type": "task_update",
            "data": task_data
        })

    async def broadcast_map_update(self, device_id: str, status: str):
        """Broadcast map indicator change (red/green)."""
        await self.broadcast({
            "type": "map_update",
            "data": {"device_id": device_id, "status": status}
        })
```

### 5.3 Frontend WebSocket Consumer

```typescript
// frontend/lib/hardware-context.tsx (existing, extended)

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  switch (msg.type) {
    case "telemetry":
      broadcastTelemetry(msg.data);
      break;
    case "incident_update":
      setIncidentStatus(msg.data);
      break;
    case "task_update":
      setTaskStatus(msg.data);
      break;
    case "map_update":
      updateMapIndicator(msg.data.device_id, msg.data.status);
      break;
  }
};
```

---

## 6. Authorization & Account Requirements

### Required External Accounts

| Service | Account Type | Purpose | Cost |
|---------|-------------|---------|------|
| **Exotel** | Full Account | Voice calls + SMS | Pay-per-use (India) |
| **Supabase** | Pro Plan | Database + Auth + Realtime | ~$25/mo |
| **Cloudflare** | Free/Paid | Tunnel + DNS | Free tier OK |
| **Map Provider** | API Key | Geocoding + Map tiles | Google Maps / Mapbox |

### Required Environment Variables

```env
# Exotel (Indian telephony)
EXOTEL_API_KEY=your_exotel_api_key
EXOTEL_API_TOKEN=your_exotel_api_token
EXOTEL_ACCOUNT_SID=your_account_sid
EXOTEL_CALLER_ID=your_exotel_phone_number  # Ex-virtual number

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxx
SUPABASE_ANON_KEY=sb_publishable_xxxx

# Backend
BASE_URL=https://your-domain.com
DEVICE_API_KEY=f7a3b2c1d4e5f6a7b8c9d0e1f2a3b4c5
```

### Required Supabase SQL Permissions

```sql
-- Enable Row Level Security with appropriate policies
ALTER ROW LEVEL SECURITY ON ALL TABLES IN SCHEMA public ENABLE;

-- Operators can read their own tasks
CREATE POLICY operator_tasks_policy ON operator_tasks
    FOR ALL TO authenticated
    USING (operator_id = auth.uid() OR
           EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Citizens can read incidents in their pincode
CREATE POLICY citizen_incidents_policy ON fault_events
    FOR SELECT TO authenticated
    USING (pincode IN (
        SELECT pincode FROM profiles WHERE id = auth.uid()
    ));
```

---

## 7. Migration Path from v1.0 → v2.0

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Phase 1** | Week 1-2 | Create new tables, add columns to existing tables, migrate data |
| **Phase 2** | Week 3-4 | Implement Twilio integration, notification service |
| **Phase 3** | Week 5-6 | Build operator task UI, SLA dashboard |
| **Phase 4** | Week 7-8 | Implement resolution lifecycle, verification flow |
| **Phase 5** | Week 9-10 | Emergency services directory, blockade requests |
| **Phase 6** | Week 11-12 | Integration testing, UAT, documentation |

---

## 8. Open Questions — RESOLVED

| # | Question | Answer |
|---|----------|--------|
| 1 | Exotel Account | **No** — Need to create one |
| 2 | Supabase Project | **Existing** — Use current project |
| 3 | Map Provider | **Leaflet + OpenStreetMap** — Free, no API key needed |
| 4 | Exotel Virtual Number | **Calls + SMS** — Single number for both |
| 5 | Operator Phone | **+91 6238786706** — Primary operator |

---

## 9. Exotel Account Setup Guide

Since you don't have an Exotel account yet:

**Step 1 — Create Account:**
- Visit https://exotel.in
- Click "Sign Up"
- Provide:
  - Business name (or personal name for testing)
  - Email address
  - Phone number for verification
  - Business type: "Other" or "IT/Software"

**Step 2 — Verification:**
- Exotel will call your number with an OTP
- Verify email and phone

**Step 3 — Initial Funding:**
- Minimum ₹1000 to start
- UPI/Netbanking available

**Step 4 — Purchase Virtual Number:**
- Buy a virtual number (₹500-1000/month)
- Choose a number with SMS + Voice capability

**Step 5 — Get API Credentials:**
- Account SID
- API Key
- API Token
- Virtual number (Caller ID)

Once you have the credentials, add them to `.env`:
```env
EXOTEL_API_KEY=your_api_key
EXOTEL_API_TOKEN=your_api_token
EXOTEL_ACCOUNT_SID=your_account_sid
EXOTEL_CALLER_ID=your_virtual_number
```

---

## 10. Implementation Decision: Map Provider

**Choice: Leaflet + OpenStreetMap (Free)**

| Criteria | Leaflet + OSM | Google Maps | Mapbox |
|----------|---------------|-------------|--------|
| Cost | Free | $200/mo free tier then paid | Free tier then paid |
| API Key | Not required | Required | Required |
| India Coverage | Excellent | Excellent | Good |
| Setup | Simple | Complex | Moderate |
| Customization | High | Limited | High |
