-- Audit log for admin edits/voids on bookings. Append-only; one row per change.
-- action: 'edit' (per-row or per-reference field changes), 'void' (all rows cancelled).
CREATE TABLE IF NOT EXISTS booking_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference text NOT NULL,
  booking_id uuid,
  edited_at timestamptz NOT NULL DEFAULT now(),
  edited_by text,
  action text NOT NULL CHECK (action IN ('edit', 'void')),
  before jsonb,
  after jsonb,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_booking_audit_ref_time
  ON booking_audit (booking_reference, edited_at DESC);
