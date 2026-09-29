# Office Desk & Room Booking App

MVP scaffold implementing the plan in `docs/SDLC_Office_Booking_App_Plan.pdf`.

## Structure

```
backend/     Express API + PostgreSQL (see docs/openapi.yaml for the full contract)
frontend/    React app (Vite) — Login, Dashboard, Confirmation screens
docs/        Planning artifacts: SDLC plan, schema doc, API reference, wireframes
```

## Getting started

### 1. Database
```bash
createdb office_booking
cd backend
cp .env.example .env   # fill in DATABASE_URL and JWT_SECRET
npm install
npm run migrate        # applies db/schema.sql
```

### 2. Backend
```bash
cd backend
npm run dev             # http://localhost:3000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev              # http://localhost:5173, proxies /v1 to the backend
```

### 4. No-show release job (run on a schedule, e.g. every 5 min)
```bash
cd backend
npm run release-job
```
In production, wire this to a cron job or a scheduled serverless function.

### 5. Tests (Phase 5 — Testing & Integration)
Point `DATABASE_URL` at a disposable test database (not production) before running these.

```bash
cd backend
npm run seed              # inserts a few desks so tests have something to book
npm test                  # Jest + Supertest: auth, booking validation, cancel, check-in,
                           # date/timezone handling for /desks/availability
npm run test:concurrency  # fires 10 simultaneous bookings at the same desk/date/timeslot
                           # and asserts exactly one succeeds — the scenario named
                           # explicitly in docs/SDLC_Office_Booking_App_Plan.pdf, Phase 5
```

## Design decisions carried over from planning

- **Concurrency:** double-bookings are blocked by a DB-level unique constraint
  (`backend/db/schema.sql`), not application locking — see `docs/Office_Booking_App_Database_Schema.docx` §3.1.
- **One desk per person per day:** a separate DB constraint (`unique_user_date`)
  stops a single user from holding more than one active booking on the same
  date, even across different desks or timeslots. Someone needing the whole
  day books FULL_DAY rather than stacking AM + PM. Enforced the same way as
  the double-booking guard — at the database layer, not in application code.
- **No-shows:** `checked_in_at` + the scheduled release job implement the
  "ghost booking" auto-release story — see schema doc §3.2.
- **Auth:** self-serve email/password signup (frontend/src/pages/Signup.jsx) so the
  app is fully click-through-able for demos; SSO is still deferred post-MVP per the
  Phase 2 scoping note.
- **Tech stack:** Node/Express + PostgreSQL + React, as finalized in the SDLC plan.

## Status

This is a scaffold — it compiles and wires together correctly but has not been
run against a live database yet. Next steps: run the migration, smoke-test each
endpoint against `docs/openapi.yaml`, then flesh out validation and tests.
