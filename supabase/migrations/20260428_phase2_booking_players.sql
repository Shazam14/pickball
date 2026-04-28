-- Phase 2.1 — Booking players (QR gate pass) + reconcile pre-existing constraints
-- Run in Supabase SQL editor. Idempotent.

-- 1) Loosen players check (was IN (2,4); UI now allows 1–20)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_players_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_players_check
  CHECK (players >= 1 AND players <= 20);

-- 2) Fix payment_method values (was ('gcash','maya','bpi'); modal uses 'gotyme')
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_method_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_method_check
  CHECK (payment_method IN ('gcash', 'maya', 'gotyme'));

-- 3) booking_players — one row per player on a booking
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

-- RLS: deny all public access; API routes use service role
ALTER TABLE booking_players ENABLE ROW LEVEL SECURITY;
