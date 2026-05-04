-- Walk-in tickets: front-desk drop-ins. One walkin row per party,
-- N walkin_tickets rows (one per head). Each ticket has a printed QR
-- that doubles as a single-use ₱50 cafe/merch coupon.
CREATE TABLE IF NOT EXISTS walkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  party_size int NOT NULL CHECK (party_size > 0),
  paid_amount_php int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

CREATE TABLE IF NOT EXISTS walkin_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  walkin_id uuid NOT NULL REFERENCES walkins(id) ON DELETE CASCADE,
  token uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  ticket_index int NOT NULL,
  coupon_redeemed_at timestamptz,
  redeemed_by text
);

CREATE INDEX IF NOT EXISTS idx_walkin_tickets_walkin
  ON walkin_tickets (walkin_id);

CREATE INDEX IF NOT EXISTS idx_walkins_created
  ON walkins (created_at DESC);
