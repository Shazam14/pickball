-- Phase A4 — Add 'onsite' to payment_method check constraint.
-- For Pay Onsite: customer reserves now, pays at the venue. Confirmation
-- is automatic (no payment_reference). We store payment_reference='ONSITE'.

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_method_check;

ALTER TABLE bookings ADD CONSTRAINT bookings_payment_method_check
  CHECK (payment_method IN ('gcash', 'maya', 'gotyme', 'onsite'));
