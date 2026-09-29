-- Office Desk & Room Booking App — Database Schema
-- Matches the ERD in Office_Booking_App_Database_Schema.docx

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'admin')),
  created_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS desks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label      VARCHAR(50) NOT NULL,
  floor      INTEGER NOT NULL,
  zone       VARCHAR(50),
  is_active  BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id),
  desk_id        UUID NOT NULL REFERENCES desks(id),
  booking_date   DATE NOT NULL,
  timeslot       VARCHAR(20) NOT NULL CHECK (timeslot IN ('AM', 'PM', 'FULL_DAY')),
  status         VARCHAR(20) NOT NULL DEFAULT 'confirmed'
                 CHECK (status IN ('confirmed', 'checked_in', 'released', 'cancelled')),
  checked_in_at  TIMESTAMP,
  created_at     TIMESTAMP NOT NULL DEFAULT now()
);

-- The double-booking guard: only one active booking per desk/date/timeslot.
-- See Office_Booking_App_Database_Schema.docx §3.1 for the rationale.
CREATE UNIQUE INDEX IF NOT EXISTS unique_desk_slot
  ON bookings (desk_id, booking_date, timeslot)
  WHERE status IN ('confirmed', 'checked_in');

-- One active desk per user per day: prevents a single employee from holding
-- multiple desks on the same date, which would defeat the app's fairness goal.
-- Someone needing the whole day books the FULL_DAY timeslot instead of
-- stacking separate AM + PM bookings.
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_date
  ON bookings (user_id, booking_date)
  WHERE status IN ('confirmed', 'checked_in');

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings (booking_date);
