-- Pay mode: 'online' = pay court + entrance online; 'onsite_entrance' = pay court online, ₱50/player at front desk.
-- All rows under a single booking reference share the same pay_mode (denormalized like players/customer_name).
ALTER TABLE bookings
  ADD COLUMN pay_mode text NOT NULL DEFAULT 'online'
  CHECK (pay_mode IN ('online', 'onsite_entrance'));
