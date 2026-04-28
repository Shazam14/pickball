-- Phase B PB.3 — multi-court bookings
-- One booking can span multiple courts at the same time/date (tournaments).
-- N rows in `bookings` share the same `reference`. Drop UNIQUE on reference,
-- add a regular index for fast lookups.

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_reference_key;

CREATE INDEX IF NOT EXISTS idx_bookings_reference
  ON bookings (reference);
