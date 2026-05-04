// Smoke for /api/admin/walkin + /api/admin/walkin/[token].
// 1. POST /api/admin/walkin party_size=3 → 3 tickets minted under one ref.
// 2. GET ticket → unredeemed.
// 3. POST redeem → coupon_redeemed_at set.
// 4. POST redeem again → 409 Already redeemed.
// 5. GET /api/admin/walkin → today's list includes the new walk-in with 1/3.
// 6. Cleanup: delete the walkin (cascades tickets).

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

let createdReference = null;

async function cleanup() {
  if (createdReference) {
    await supabase.from('walkins').delete().eq('reference', createdReference);
  }
}

function pass(msg) { console.log('✅', msg); }
function fail(msg, extra) { console.log('❌', msg, extra ?? ''); process.exit(1); }

try {
  // 1. Mint
  const mintRes = await fetch(`${BASE}/api/admin/walkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: AUTH },
    body: JSON.stringify({ key: KEY, party_size: 3, created_by: 'SmokeBot' }),
  });
  const mintData = await mintRes.json();
  if (!mintRes.ok) fail('mint POST failed', mintData);
  if (mintData.tickets?.length !== 3) fail('expected 3 tickets', mintData);
  if (!mintData.walkin?.reference?.startsWith('WI-')) fail('reference shape wrong', mintData);
  if (mintData.walkin.paid_amount_php !== 150) fail('paid_amount_php should be 150', mintData);
  createdReference = mintData.walkin.reference;
  pass(`mint: 3 tickets under ${createdReference}, ₱${mintData.walkin.paid_amount_php}`);

  const t1 = mintData.tickets[0];

  // 2. GET ticket
  const getRes = await fetch(`${BASE}/api/admin/walkin/${t1.token}?key=${encodeURIComponent(KEY)}`, {
    headers: { Authorization: AUTH },
  });
  const getData = await getRes.json();
  if (!getRes.ok) fail('GET ticket failed', getData);
  if (getData.ticket.coupon_redeemed_at !== null) fail('expected unredeemed on fresh ticket', getData);
  if (getData.walkin.reference !== createdReference) fail('GET returned wrong walkin', getData);
  pass('GET ticket: unredeemed, walkin attached');

  // 3. Redeem
  const redeemRes = await fetch(`${BASE}/api/admin/walkin/${t1.token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: AUTH },
    body: JSON.stringify({ key: KEY, redeemed_by: 'SmokeBot' }),
  });
  const redeemData = await redeemRes.json();
  if (!redeemRes.ok) fail('redeem POST failed', redeemData);
  if (!redeemData.ticket.coupon_redeemed_at) fail('coupon_redeemed_at should be set', redeemData);
  if (redeemData.ticket.redeemed_by !== 'SmokeBot') fail('redeemed_by should be SmokeBot', redeemData);
  pass(`redeem: ticket #${t1.ticket_index} marked at ${redeemData.ticket.coupon_redeemed_at}`);

  // 4. Double-redeem rejected
  const dupRes = await fetch(`${BASE}/api/admin/walkin/${t1.token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: AUTH },
    body: JSON.stringify({ key: KEY, redeemed_by: 'SmokeBot2' }),
  });
  const dupData = await dupRes.json();
  if (dupRes.status !== 409) fail('expected 409 on double redeem', { status: dupRes.status, dupData });
  pass('double redeem: 409 rejected as expected');

  // 5. GET today's list
  const listRes = await fetch(`${BASE}/api/admin/walkin?key=${encodeURIComponent(KEY)}`, {
    headers: { Authorization: AUTH },
  });
  const listData = await listRes.json();
  if (!listRes.ok) fail('GET list failed', listData);
  const found = listData.walkins.find(w => w.reference === createdReference);
  if (!found) fail('new walkin missing from today list', listData);
  if (found.tickets_total !== 3) fail('tickets_total should be 3', found);
  if (found.tickets_redeemed !== 1) fail('tickets_redeemed should be 1', found);
  pass(`list: ${createdReference} shows 1/3 redeemed`);

  // 6. Auth-failure check
  const noAuthRes = await fetch(`${BASE}/api/admin/walkin?key=wrong`, {
    headers: { Authorization: AUTH },
  });
  if (noAuthRes.status !== 401) fail('expected 401 with wrong key', { status: noAuthRes.status });
  pass('wrong key: 401 rejected');

  console.log('\n🎉 All walk-in smokes passed');
} finally {
  await cleanup();
  if (createdReference) console.log(`🧹 cleaned ${createdReference}`);
}
