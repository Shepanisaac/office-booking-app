# Office Desk & Room Booking API — Reference

Base URL: `/v1` · Auth: Bearer JWT (except `/auth/*`) · All bodies are JSON.

This reference maps directly onto the [database schema](Office_Booking_App_Database_Schema.docx) —
each endpoint's job is described alongside the constraint or column it relies on. The full
machine-readable spec is in `openapi.yaml`.

---

## Auth

### `POST /auth/register`
Create a new user account.

**Body**
```json
{ "name": "Isaac Daber", "email": "isaac@example.com", "password": "••••••••" }
```
**Responses:** `201` User created · `409` Email already registered

### `POST /auth/login`
Authenticate and receive a bearer token.

**Body**
```json
{ "email": "isaac@example.com", "password": "••••••••" }
```
**Responses:** `200` `{ token, user }` · `401` Invalid credentials

> SSO is out of scope for MVP (per the Phase 2 scoping note) — email/password only for now.

---

## Desks

### `GET /desks`
List active desks. Optional query params: `floor`, `zone`.

### `GET /desks/availability?date=2026-09-24&timeslot=AM`
Supports the *"view available desks for tomorrow"* user story. Returns every active desk
paired with an `available: true/false` flag for the requested date and timeslot, computed
by checking for an existing row in `bookings` with a matching `(desk_id, booking_date,
timeslot)` and an active status.

---

## Bookings

### `POST /bookings`
Reserve a desk — the *"reserve a desk so double-bookings are systematically blocked"* story.

**Body**
```json
{ "desk_id": "uuid", "booking_date": "2026-09-24", "timeslot": "AM" }
```

**How the block works:** this endpoint doesn't pre-check availability and hope nothing
changes before the insert — it relies on the database's `UNIQUE (desk_id, booking_date,
timeslot)` constraint (see schema doc §3.1). If two requests for the same desk/date/slot
arrive at nearly the same time, the database itself rejects the second one, and this
endpoint returns `409` for it. No race condition, no app-level locking needed.

**Responses:** `201` Booking confirmed · `409` Desk no longer available

### `GET /bookings`
List the authenticated user's own bookings. Optional `status` filter (`confirmed`,
`checked_in`, `released`, `cancelled`).

### `DELETE /bookings/{bookingId}`
Cancel a booking. Sets `status = 'cancelled'` rather than deleting the row, preserving
history for analytics.

### `POST /bookings/{bookingId}/check-in`
Marks `checked_in_at` on the booking. This is the other half of the *ghost-booking / no-show*
story: a scheduled job separately watches for bookings where the timeslot has started,
`checked_in_at` is still null, and more than 15 minutes have passed — it flips those to
`status = 'released'`, freeing the desk. Calling check-in after that window returns `410`,
since the desk has already been released to someone else.

---

## Admin

### `POST /admin/desks`
Add a new desk (admin role only, per the `role` column on Users).

### `GET /admin/bookings?date=&status=`
List all bookings across all users — used for the "which desks have the highest no-show
rate" type reporting mentioned in the schema doc.

---

## Status Codes Used

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Resource created |
| 401 | Not authenticated |
| 403 | Authenticated but not authorized (e.g. non-admin hitting `/admin/*`) |
| 404 | Resource not found |
| 409 | Conflict — most notably a desk already booked for that slot |
| 410 | Gone — booking auto-released due to no-show |

## Deferred (matches schema doc §4)

- Room booking endpoints (would reuse the same `Desks`/`Bookings` shape once resources are generalized)
- Recurring booking endpoints
- SSO callback endpoints
