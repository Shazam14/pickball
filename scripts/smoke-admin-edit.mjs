// Smoke for /api/admin/booking/[ref] — edit/conflict/void/audit.
// 1. Create a confirmed booking → GET → expect rows + empty audit.
// 2. PATCH customer name → DB updated + audit row appended.
// 3. PATCH slot to a free court → slot updated.
// 4. PATCH slot to a different ref's court+time → 409 conflict.
// 5. DELETE → all rows cancelled + audit 'void' row appended.

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
const KEY = env.ADMIN_PASSWORD;

if (!KEY) {
  console.log('❌ ADMIN_PASSWORD missing from .env.local');
  process.exit(1);
}

const future = new Date(Date.now() + 30 * 86400_000);
const date = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`;

const COURT_A = 7;
const COURT_B = 9;
const HOUR = 14;

async function cleanup() {
  await supabase.from('bookings').delete().eq('booking_date', date).in('court_number', [COURT_A, COURT_B, 8]);
}

async function makeConfirmed(court, hour, name = 'Smoke Edit') {
  const lockRes = await fetch(`${BASE}/api/lock-slot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: AUTH },
    body: JSON.stringify({
      ranges: [{ court_number: court, start_time: `${hour}:00`, duration: 1 }],
      booking_date: date,
      players: 2,
      customer_name: name,
      customer_phone: '09171234567',
      customer_email: 'edit@smoke.test',
      pay_mode: 'online',
    }),
  });
  const locked = await lockRes.json();
  // Manually flip to confirmed to avoid the payment loop.
  await supabase.from('bookings').update({ status: 'confirmed' }).eq('reference', locked.reference);
  return locked.reference;
}

async function adminGet(ref) {
  const res = await fetch(`${BASE}/api/admin/booking/${encodeURIComponent(ref)}?key=${KEY}`, {
    headers: { Authorization: AUTH },
  });
  return { status: res.status, body: await res.json() };
}
async function adminPatch(ref, payload) {
  const res = await fetch(`${BASE}/api/admin/booking/${encodeURIComponent(ref)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: AUTH },
    body: JSON.stringify({ key: KEY, ...payload }),
  });
  return { status: res.status, body: await res.json() };
}
async function adminDelete(ref, payload = {}) {
  const res = await fetch(`${BASE}/api/admin/booking/${encodeURIComponent(ref)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: AUTH },
    body: JSON.stringify({ key: KEY, ...payload }),
  });
  return { status: res.status, body: await res.json() };
}

console.log(`Test date: ${date} | testing court ${COURT_A} & ${COURT_B} @ ${HOUR}:00\n`);

await cleanup();

// === 1. Create + GET ===
console.log('1. Create confirmed booking + GET');
const refA = await makeConfirmed(COURT_A, HOUR, 'Original Name');
let r = await adminGet(refA);
console.log(`   GET ${r.status} · rows=${r.body.rows?.length} · audit=${r.body.audit?.length}`);
if (r.status !== 200 || r.body.rows?.length !== 1) console.log('   ❌ FAIL');

// === 2. PATCH customer name ===
console.log('\n2. PATCH customer name (skip email re-send by clearing email)');
r = await adminPatch(refA, {
  edited_by: 'Smoke Test',
  notes: 'updated via smoke',
  customer_name: 'Renamed Customer',
  customer_email: null,
});
console.log(`   PATCH ${r.status} · ok=${r.body.ok}`);
r = await adminGet(refA);
console.log(`   name now: "${r.body.rows?.[0]?.customer_name}" · audit rows: ${r.body.audit?.length}`);
const lastAudit = r.body.audit?.[0];
console.log(`   last audit: action=${lastAudit?.action} · by=${lastAudit?.edited_by} · notes=${lastAudit?.notes}`);
if (r.body.rows?.[0]?.customer_name !== 'Renamed Customer') console.log('   ❌ FAIL name not updated');
if (lastAudit?.action !== 'edit' || lastAudit?.edited_by !== 'Smoke Test') console.log('   ❌ FAIL audit row malformed');

// === 3. PATCH slot court_number to a free court ===
console.log('\n3. PATCH slot to free court (8)');
const slotId = r.body.rows[0].id;
r = await adminPatch(refA, {
  edited_by: 'Smoke Test',
  rows: [{ id: slotId, court_number: 8 }],
});
console.log(`   PATCH ${r.status} · ok=${r.body.ok}`);
r = await adminGet(refA);
console.log(`   court now: ${r.body.rows?.[0]?.court_number} (expect 8)`);
if (r.body.rows?.[0]?.court_number !== 8) console.log('   ❌ FAIL court not moved');

// === 4. Conflict: another booking at COURT_B, then try to move refA into it ===
console.log('\n4. Create refB on court 9 + try to PATCH refA into court 9 → expect 409');
const refB = await makeConfirmed(COURT_B, HOUR, 'Other Customer');
r = await adminPatch(refA, {
  edited_by: 'Smoke Test',
  rows: [{ id: slotId, court_number: COURT_B }],
});
console.log(`   PATCH ${r.status} · error=${r.body.error}`);
console.log(`   conflict ref: ${r.body.conflict?.reference} (expect ${refB})`);
if (r.status !== 409 || r.body.conflict?.reference !== refB) console.log('   ❌ FAIL conflict not surfaced');

// === 5. DELETE refA → all cancelled + audit ===
console.log('\n5. DELETE refA');
r = await adminDelete(refA, { edited_by: 'Smoke Test', notes: 'voided in smoke' });
console.log(`   DELETE ${r.status} · ok=${r.body.ok}`);
r = await adminGet(refA);
const allCancelled = r.body.rows?.every(row => row.status === 'cancelled');
const voidEntry = r.body.audit?.find(a => a.action === 'void');
console.log(`   all cancelled: ${allCancelled} · void audit row: ${voidEntry ? 'yes' : 'no'}`);
if (!allCancelled || !voidEntry) console.log('   ❌ FAIL void incomplete');

await cleanup();
console.log('\n✓ admin-edit smoke complete');
