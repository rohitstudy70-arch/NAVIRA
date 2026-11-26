# Navira School API

Base URL: `http://localhost:5000/api`. Protected routes use `Authorization: Bearer <JWT>`.

## Authentication

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/login` | Authenticate with `{ email, password }`; returns `{ token, user }` |
| GET | `/auth/me` | Return the authenticated session user |

Roles are `super_admin`, `school_admin`, `principal`, `teacher`, and `office_staff`. Teachers are limited to their assigned classes for student and attendance records; office staff is view-only in the UI.

## RFID scan endpoint

`POST /attendance/scan` validates a reader-specific key rather than a user JWT.

Headers:

```http
Content-Type: application/json
x-device-api-key: <reader API key>
```

Body:

```json
{
  "cardUID": "A1B2C3D4",
  "deviceId": "GATE01",
  "timestamp": "2026-11-26T08:05:12+05:30"
}
```

The API resolves the student/staff RFID UID, marks the first scan IN, then marks OUT for an auto-direction reader, and ignores scans inside the configured duplicate window. It emits `attendance:scan` through Socket.IO to connected dashboards. An unregistered card returns `404` with `CARD_NOT_REGISTERED` and emits `attendance:alert`.

Example response:

```json
{
  "success": true,
  "duplicate": false,
  "message": "IN scan recorded",
  "direction": "in",
  "person": { "name": "Aarav Kumar", "photo": null, "personType": "student" }
}
```

## Operational endpoints

| Route | Operations | Access |
| --- | --- | --- |
| `/attendance/dashboard` | GET today's live summary | authenticated users |
| `/attendance` | GET by `date`, `classId`, `section`, `status`, `personType` | authenticated users |
| `/attendance/:id/correct` | PATCH `{ status, inTime, outTime, reason }` | admins, principal, teacher scope |
| `/students`, `/staff` | GET, POST, PATCH, DELETE (soft deactivate) | access varies by role |
| `/classes`, `/holidays`, `/leaves` | GET, POST, PATCH | authenticated/admin as appropriate |
| `/devices` | GET, POST, PATCH | device registration: Super Admin |
| `/settings` | GET, PATCH | Settings update: Super Admin |
| `/users` | GET, POST, PATCH | Super Admin |
| `/audit-logs` | GET | Super Admin |

## Socket.IO events

Connect to the API host (default `http://localhost:5000`). The server sends `system:ready` on connect.

- `attendance:scan`: scan/attendance payload for live feed updates
- `attendance:alert`: unregistered-card alert payload

## Suggested production hardening

- Serve API and web application only over HTTPS.
- Replace the seed password and demo device key immediately.
- Place device keys in a secret manager and rotate them regularly.
- Put API endpoints behind rate limiting and configure trusted reverse-proxy IPs.
- Wire `Notification` records to approved SMS, WhatsApp, and email providers.
