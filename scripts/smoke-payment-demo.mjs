// End-to-end smoke for /api/payment-confirmed.
// 1. POST /api/lock-slot to create a fresh locked booking.
// 2. POST /api/payment-confirmed with the matching amount.
// 3. Verify the booking flipped from 'locked' to 'confirmed'.
// 4. Negative case: send wrong amount, expect no_match.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// Pull supabase credentials from .env.local
const env = readFileSync('/home/skmc/DevGit/pickball/.env.local', 'utf-8')
  .split('\n')
  .reduce((acc, line) => {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) acc[m[1]] = m[2];
    return acc;
  }, {});

const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = 'http://localhost:3000';
const AUTH = 'Basic ' + Buffer.from('sideout:sideoutengr').toString('base64');
const supabase = createClient(SUPA_URL, SUPA_KEY);

const today = new Date();
const future = new Date(today.getTime() + 14 * 86400_000);
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const date = isoOf(future);

// Pick an obscure court+hour to avoid collision with existing tests
const TEST_COURT = 9;
const TEST_HOUR = '15:00';
const DURATION = 2;
const PLAYERS = 3;

// Mirrors lib/types.ts priceForHour. No holiday list here — booking 14 days out,
// scripts/demo dates won't coincide with PH holidays in practice.
function priceForHour(dateStr, hour) {
  const dow = new Date(dateStr + 'T00:00:00').getDay();
  if (dow === 0 || dow === 6) return 700;
  return hour < 16 ? 600 : 700;
}
const startHour = parseInt(TEST_HOUR.split(':')[0]);
let _courtFee = 0;
for (let h = startHour; h < startHour + DURATION; h++) _courtFee += priceForHour(date, h);
const EXPECTED_TOTAL = _courtFee + PLAYERS * 50;

async function cleanup() {
  await supabase.from('bookings')
    .delete()
    .eq('booking_date', date)
    .eq('court_number', TEST_COURT);
}

async function lockSlot() {
  const res = await fetch(`${BASE}/api/lock-slot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': AUTH },
    body: JSON.stringify({
      court_numbers: [TEST_COURT],
      booking_date: date,
      start_time: TEST_HOUR,
      duration: DURATION,
      players: PLAYERS,
      customer_name: 'Smoke Test User',
      customer_phone: '09171234567',
      customer_email: 'smoke@test.com',
    }),
  });
  return res.json();
}

async function firePayment({ amount, reference }) {
  const res = await fetch(`${BASE}/api/payment-confirmed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': AUTH },
    body: JSON.stringify({
      amount, reference, sender_name: 'Smoke Test User',
      provider: 'gcash', received_at: new Date().toISOString(),
    }),
  });
  return res.json();
}

async function getStatus(reference) {
  const { data } = await supabase
    .from('bookings').select('reference,status,payment_method,payment_reference')
    .eq('reference', reference);
  return data;
}

console.log(`Test date: ${date}, court ${TEST_COURT} @ ${TEST_HOUR}, expected total ₱${EXPECTED_TOTAL}\n`);

await cleanup();

// === 1. Negative: send payment with no booking locked ===
console.log('1. Fire payment with no locked bookings — expect no_match');
let r = await firePayment({ amount: EXPECTED_TOTAL, reference: 'GC-NOLOCK-1' });
console.log('   →', r.result, '·', r.reason || '');
if (r.result !== 'no_match') console.log('   ❌ unexpected');

// === 2. Lock a booking, fire wrong amount → no_match ===
console.log('\n2. Lock a booking, fire WRONG amount — expect no_match');
let lock = await lockSlot();
const ref = lock.reference;
console.log('   locked:', ref, 'total expected:', EXPECTED_TOTAL);
r = await firePayment({ amount: EXPECTED_TOTAL + 100, reference: 'GC-WRONG-1' });
console.log('   →', r.result, '·', r.reason || '');
if (r.result !== 'no_match') console.log('   ❌ should have been no_match');
let status = await getStatus(ref);
console.log('   booking status:', status[0]?.status, '(expect: locked)');

// === 3. Fire correct amount → confirmed ===
console.log('\n3. Fire CORRECT amount — expect confirmed');
r = await firePayment({ amount: EXPECTED_TOTAL, reference: 'GC-CORRECT-1' });
console.log('   →', r.result);
if (r.result === 'confirmed') {
  console.log('   ✓ matched ref:', r.reference, '· courts:', r.courts);
}
status = await getStatus(ref);
console.log('   booking status:', status[0]?.status, '(expect: confirmed)');
console.log('   payment_method:', status[0]?.payment_method, '· payment_reference:', status[0]?.payment_reference);

// === 4. Fire-again: should no_match (already confirmed) ===
console.log('\n4. Fire correct amount AGAIN — expect no_match (booking now confirmed)');
r = await firePayment({ amount: EXPECTED_TOTAL, reference: 'GC-DUP-1' });
console.log('   →', r.result, '·', r.reason || '');

// === 5. Tolerance test: ±₱5 should match ===
console.log('\n5. Lock another, fire amount within ±₱5 tolerance — expect confirmed');
await cleanup();
lock = await lockSlot();
const ref2 = lock.reference;
r = await firePayment({ amount: EXPECTED_TOTAL - 3, reference: 'GC-TOLERANCE-1' });
console.log('   →', r.result, '·', r.detail || '');
status = await getStatus(ref2);
console.log('   booking status:', status[0]?.status, '(expect: confirmed)');

// === 6. Tolerance test: ±₱6 should NOT match ===
console.log('\n6. Lock another, fire amount OUTSIDE tolerance (-₱6) — expect no_match');
await cleanup();
lock = await lockSlot();
const ref3 = lock.reference;
r = await firePayment({ amount: EXPECTED_TOTAL - 6, reference: 'GC-OUTSIDE-1' });
console.log('   →', r.result, '·', r.reason || '');
status = await getStatus(ref3);
console.log('   booking status:', status[0]?.status, '(expect: locked)');

await cleanup();
console.log('\n✓ Smoke complete (test rows cleaned up)');
