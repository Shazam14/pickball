// Smoke for /api/lock-slot multi-range support.
// 1. Lock 2 different ranges in one call (SO3 9-10am, SO5 2-4pm).
// 2. Verify 2 rows inserted with same reference but distinct times/courts.
// 3. Verify legacy single-range body still works.
// 4. Verify conflict detection per (court, time): re-lock SO3 9-10am should 409.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

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

const future = new Date(Date.now() + 21 * 86400_000);
const date = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`;

async function cleanup() {
  await supabase.from('bookings').delete().eq('booking_date', date).in('court_number', [3, 5, 7]);
}

async function lock(body) {
  const res = await fetch(`${BASE}/api/lock-slot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': AUTH },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

console.log(`Test date: ${date}`);
await cleanup();

// === 1. Multi-range body: 2 distinct (court, time) tuples ===
console.log('\n1. Multi-range lock — SO3 9-10am + SO5 2-4pm');
let r = await lock({
  ranges: [
    { court_number: 3, start_time: '09:00', duration: 1 },
    { court_number: 5, start_time: '14:00', duration: 2 },
  ],
  booking_date: date,
  players: 4,
  customer_name: 'Multi Smoke',
  customer_phone: '09171234567',
  customer_email: 'multi@smoke.test',
});
console.log('   →', r.status, JSON.stringify(r.body));
const ref1 = r.body.reference;

const { data: rows1 } = await supabase
  .from('bookings').select('reference, court_number, start_time, end_time, duration, status')
  .eq('reference', ref1).order('court_number');
console.log('   DB rows:', rows1?.length, '(expect 2)');
rows1?.forEach(row => console.log('     · SO' + row.court_number, row.start_time, '–', row.end_time, '·', row.status));

// === 2. Legacy single-range body still works ===
console.log('\n2. Legacy body — SO7 6-8pm (single contiguous block)');
r = await lock({
  court_numbers: [7],
  start_time: '18:00',
  duration: 2,
  booking_date: date,
  players: 2,
  customer_name: 'Legacy Smoke',
  customer_phone: '09171234568',
});
console.log('   →', r.status, JSON.stringify(r.body));
const ref2 = r.body.reference;
const { data: rows2 } = await supabase
  .from('bookings').select('court_number, start_time, end_time').eq('reference', ref2);
console.log('   DB rows:', rows2?.length, '(expect 1)');
rows2?.forEach(row => console.log('     · SO' + row.court_number, row.start_time, '–', row.end_time));

// === 3. Conflict — re-lock SO3 9-10am should 409 ===
console.log('\n3. Re-lock SO3 9-10am — expect 409');
r = await lock({
  ranges: [{ court_number: 3, start_time: '09:00', duration: 1 }],
  booking_date: date,
  players: 1,
  customer_name: 'Conflict Smoke',
  customer_phone: '09171234569',
});
console.log('   →', r.status, JSON.stringify(r.body));

// === 4. Partial overlap — re-lock SO5 3-5pm (overlaps 2-4pm) should 409 ===
console.log('\n4. Re-lock SO5 3-5pm (overlaps existing 2-4pm) — expect 409');
r = await lock({
  ranges: [{ court_number: 5, start_time: '15:00', duration: 2 }],
  booking_date: date,
  players: 1,
  customer_name: 'Overlap Smoke',
  customer_phone: '09171234569',
});
console.log('   →', r.status, JSON.stringify(r.body));

// === 5. Different court same time — should succeed (per-court isolation) ===
console.log('\n5. Lock SO7 9-10am (same hour, different court) — expect 200');
r = await lock({
  ranges: [{ court_number: 7, start_time: '09:00', duration: 1 }],
  booking_date: date,
  players: 1,
  customer_name: 'Isolation Smoke',
  customer_phone: '09171234570',
});
console.log('   →', r.status, JSON.stringify(r.body));

await cleanup();
console.log('\n✓ Smoke complete (test rows cleaned up)');
