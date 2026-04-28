-- SideOut Court Booking — Supabase Schema
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference       TEXT UNIQUE NOT NULL,
  court_number    INTEGER NOT NULL CHECK (court_number BETWEEN 1 AND 10),
  booking_date    DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  duration        INTEGER NOT NULL CHECK (duration IN (1, 2, 3)),
  players         INTEGER NOT NULL CHECK (players >= 1 AND players <= 20),
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT NOT NULL,
  customer_email  TEXT,
  payment_method  TEXT CHECK (payment_method IN ('gcash', 'maya', 'gotyme', 'onsite')),
  payment_reference TEXT,
  status          TEXT NOT NULL DEFAULT 'locked'
                  CHECK (status IN ('locked', 'confirmed', 'cancelled', 'expired')),
  locked_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at    TIMESTAMPTZ
);

-- Index for fast availability lookups
CREATE INDEX IF NOT EXISTS idx_bookings_availability
  ON bookings (court_number, booking_date, status, locked_until);

-- Index for admin views
CREATE INDEX IF NOT EXISTS idx_bookings_date
  ON bookings (booking_date, status);

-- Enable Row Level Security
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Public can only read confirmed bookings (for availability display)
CREATE POLICY "Public read confirmed" ON bookings
  FOR SELECT USING (status = 'confirmed');

-- All writes go through service role (API routes) — no public insert/update

-- Phase 2 — Booking players (QR gate pass)
CREATE TABLE IF NOT EXISTS booking_players (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  full_name       TEXT,
  checkin_token   UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  checked_in_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_players_booking
  ON booking_players (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_players_token
  ON booking_players (checkin_token);

ALTER TABLE booking_players ENABLE ROW LEVEL SECURITY;
-- No public policies; all access via service role.
