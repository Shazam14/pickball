// Smoke for pay_mode end-to-end.
// 1. Lock with pay_mode='online' → fire court + entrance amount → confirmed.
// 2. Lock with pay_mode='onsite_entrance' → fire court-only amount → confirmed.
// 3. Negative: onsite_entrance lock + fire court+entrance amount → no_match.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = readFileSync('/home/skmc/DevGit/pickball/.env.local', 'utf-8')
  .split('\n').reduce((acc, line) => {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) acc[m[1]] = m[2];
    return acc;
  }, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const BASE = 'http://localhost:3000';
const AUTH = 'Basic ' + Buffer.from('sideout:sideoutengr').toString('base64');

const future = new Date(Date.now() + 28 * 86400_000);
const date = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`;

function priceForHour(dateStr, hour) {
  const dow = new Date(dateStr + 'T00:00:00').getDay();
  if (dow === 0 || dow === 6) return 700;
  return hour < 16 ? 600 : 700;
}

const COURT = 8;
const HOUR = 15;
const DURATION = 2;
const PLAYERS = 4;
let courtFee = 0;
for (let h = HOUR; h < HOUR + DURATION; h++) courtFee += priceForHour(date, h);
const ENTRANCE = PLAYERS * 50;
const ONLINE_TOTAL = courtFee + ENTRANCE;
const ONSITE_TOTAL = courtFee;

async function cleanup() {
  await supabase.from('bookings').delete().eq('booking_date', date).eq('court_number', COURT);
}

async function lock(pay_mode) {
  const res = await fetch(`${BASE}/api/lock-slot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': AUTH },
    body: JSON.stringify({
      ranges: [{ court_number: COURT, start_time: `${HOUR}:00`, duration: DURATION }],
      booking_date: date,
      players: PLAYERS,
      customer_name: 'PayMode Smoke',
      customer_phone: '09171234567',
      customer_email: 'paymode@smoke.test',
      pay_mode,
    }),
  });
  return res.json();
}
async function fire(amount, reference) {
  const res = await fetch(`${BASE}/api/payment-confirmed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': AUTH },
    body: JSON.stringify({
      amount, reference, sender_name: 'PayMode Smoke',
      provider: 'gcash', received_at: new Date().toISOString(),
    }),
  });
  return res.json();
}
async function statusOf(ref) {
  const { data } = await supabase.from('bookings').select('status, pay_mode').eq('reference', ref);
  return data?.[0];
}

console.log(`Test date: ${date} | court ${COURT} ${HOUR}:00 ${DURATION}h ${PLAYERS} players`);
console.log(`Court fee=₱${courtFee} | online_total=₱${ONLINE_TOTAL} | onsite_total=₱${ONSITE_TOTAL}\n`);

await cleanup();

// === 1. pay_mode=online: fire full amount → confirmed ===
console.log('1. Lock pay_mode=online, fire full amount (court + entrance)');
let r = await lock('online');
console.log('   locked:', r.reference, '· pay_mode:', r.ranges ? '(ranges body)' : '');
r = await fire(ONLINE_TOTAL, 'GC-PM-ONLINE-1');
console.log('   →', r.result, '· matched:', r.matched_amount);
let s = await statusOf(r.reference);
console.log('   db:', s?.status, '· pay_mode:', s?.pay_mode);
if (r.result !== 'confirmed' || s?.pay_mode !== 'online') console.log('   ❌ FAIL');

await cleanup();

// === 2. pay_mode=onsite_entrance: fire court-only → confirmed ===
console.log('\n2. Lock pay_mode=onsite_entrance, fire court-only amount');
r = await lock('onsite_entrance');
const onsiteRef = r.reference;
console.log('   locked:', onsiteRef);
r = await fire(ONSITE_TOTAL, 'GC-PM-ONSITE-1');
console.log('   →', r.result, '· matched:', r.matched_amount);
s = await statusOf(onsiteRef);
console.log('   db:', s?.status, '· pay_mode:', s?.pay_mode);
if (r.result !== 'confirmed' || s?.pay_mode !== 'onsite_entrance') console.log('   ❌ FAIL');

await cleanup();

// === 3. onsite_entrance lock + wrong amount (court+entrance) → no_match ===
console.log('\n3. Lock pay_mode=onsite_entrance, fire FULL amount (should not match)');
r = await lock('onsite_entrance');
const onsiteRef2 = r.reference;
r = await fire(ONLINE_TOTAL, 'GC-PM-ONSITE-WRONG');
console.log('   →', r.result, '·', r.reason || '');
s = await statusOf(onsiteRef2);
console.log('   db:', s?.status, '(expect: locked)');
if (r.result !== 'no_match') console.log('   ❌ FAIL');

await cleanup();
console.log('\n✓ pay_mode smoke complete');
