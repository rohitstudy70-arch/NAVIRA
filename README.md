# Navira School RFID Attendance System

A responsive administration platform for school attendance captured at RFID gates and classrooms.

## Stack

- React 18 + Vite + Tailwind CSS
- Node.js + Express + Socket.IO
- MongoDB + Mongoose
- JWT authentication with role-based authorization

## Quick start

1. Install Node.js 20+ and MongoDB 7+.
2. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI`, `JWT_SECRET`, and RFID device key(s).
3. From the project folder run `npm run install:all`.
4. Seed the starter school: `npm run seed`.
5. Run the client and API: `npm run dev`.
6. Open `http://localhost:5173`.

Starter Super Admin: `admin@naviraschool.edu` / `ChangeMe123!` (change it immediately).

## Folder structure

```
navira-attendance/
  client/                 React administration dashboard
  server/                 Express API, Socket.IO server, MongoDB models
  docs/API.md             API reference and RFID integration
  firmware/esp32-rc522.ino  RFID reader example
```

## Security notes

- Never commit `server/.env` or device API keys.
- Use HTTPS and rotate `JWT_SECRET`/device keys before production deployment.
- The seed credentials are development-only.

## Features in this foundation

- Role-based login/session handling and audit trail
- RFID scan endpoint with device-key validation and duplicate protection
- Live dashboard events over Socket.IO
- Student, staff, class, device, attendance, leave, notification, holiday and setting models
- Responsive dashboard UI with attendance filters, live feed, and manual correction workflow

See [API documentation](docs/API.md) for the full endpoint contract and reader setup.
