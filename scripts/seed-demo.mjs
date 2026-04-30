#!/usr/bin/env node
/**
 * Seed demo availability for a given date so the matrix shows all 3 states:
 *   19:00–20:00  Courts 1–10  → FULL  (0 courts free)
 *   20:00–21:00  Courts 1–8   → LIMITED  (2 courts free: 9, 10)
 *   21:00–22:00  Courts 1–4   → AVAILABLE  (6 courts free: 5–10)
 *
 * Usage:
 *   node scripts/seed-demo.mjs [YYYY-MM-DD]   # default: today (Manila)
 *   node scripts/seed-demo.mjs --clear [YYYY-MM-DD]
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// ── env ────────────────────────────────────────────────────────────────────
function readEnvLocal() {
  try {
    const raw = readFileSync('.env.local', 'utf8')
    const env = {}
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^=#\s][^=]*)=(.*)$/)
      if (m) env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '')
    }
    return env
  } catch {
    return {}
  }
}

const env = { ...readEnvLocal(), ...process.env }
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── args ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const clearMode = args.includes('--clear')
const dateArg = args.find(a => /^\d{4}-\d{2}-\d{2}$/.test(a))

function manilaToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
}

const targetDate = dateArg ?? manilaToday()
console.log(`Target date: ${targetDate}${clearMode ? ' (clear mode)' : ''}`)

// ── seed data ──────────────────────────────────────────────────────────────
// Each entry: { start, end, courts[] }
// 19:00–20:00: all 10 → FULL
// 20:00–21:00: courts 1–8 → LIMITED (2 free)
// 21:00–22:00: courts 1–4 → AVAILABLE (6 free)
const SEED_SLOTS = [
  { start: '19:00', end: '20:00', courts: [1,2,3,4,5,6,7,8,9,10] },
  { start: '20:00', end: '21:00', courts: [1,2,3,4,5,6,7,8] },
  { start: '21:00', end: '22:00', courts: [1,2,3,4] },
]

const DEMO_REF_PREFIX = 'DEMO-SEED-'

// ── clear ──────────────────────────────────────────────────────────────────
async function clearSeeds(date) {
  const { data, error } = await supabase
    .from('bookings')
    .delete()
    .eq('booking_date', date)
    .like('reference', `${DEMO_REF_PREFIX}%`)
    .select('reference')

  if (error) { console.error('Clear failed:', error.message); process.exit(1) }
  console.log(`Cleared ${data?.length ?? 0} seed bookings for ${date}`)
}

// ── insert ─────────────────────────────────────────────────────────────────
async function seedDate(date) {
  const rows = []
  let idx = 1
  for (const slot of SEED_SLOTS) {
    for (const court of slot.courts) {
      rows.push({
        reference: `${DEMO_REF_PREFIX}${date}-${String(idx).padStart(3,'0')}`,
        booking_date: date,
        start_time: slot.start,
        end_time: slot.end,
        court_number: court,
        duration: 1,
        players: 2,
        customer_name: 'Demo Seed',
        customer_phone: '09000000000',
        status: 'confirmed',
        payment_method: 'gcash',
        payment_reference: 'DEMO-SEED',
        confirmed_at: new Date().toISOString(),
      })
      idx++
    }
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert(rows)
    .select('reference, court_number, start_time')

  if (error) { console.error('Insert failed:', error.message); process.exit(1) }
  console.log(`Seeded ${data?.length ?? rows.length} bookings for ${date}:`)
  console.log('  19:00–20:00  Courts 1–10  → FULL')
  console.log('  20:00–21:00  Courts 1–8   → LIMITED')
  console.log('  21:00–22:00  Courts 1–4   → AVAILABLE')
}

// ── run ────────────────────────────────────────────────────────────────────
if (clearMode) {
  await clearSeeds(targetDate)
} else {
  await clearSeeds(targetDate)
  await seedDate(targetDate)
}
