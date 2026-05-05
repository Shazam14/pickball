import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { ENTRANCE_FEE_PER_PERSON, courtFeeFor } from '@/lib/types'
import { getHolidays } from '@/lib/holidays'
import { sendConfirmationEmail, sendConfirmationSMS } from '@/lib/notifications'

/**
 * Mock-parser endpoint. Accepts what a real GCash/Maya/GoTyme email parser
 * would extract, and tries to match exactly one locked booking by amount.
 * If matched, auto-confirms (no admin needed).
 *
 * Real version (v2) swaps the input source to Resend Inbound webhook + a
 * per-provider parser. Match + confirm logic stays identical.
 *
 * POST /api/payment-confirmed
 *   { amount: number, reference: string, sender_name?: string,
 *     provider: 'gcash' | 'maya' | 'gotyme', received_at?: string }
 */

const AMOUNT_TOLERANCE = 5  // ₱5 fee/rounding tolerance

interface PaymentPayload {
  amount: number
  reference: string
  sender_name?: string
  provider: 'gcash' | 'maya' | 'gotyme'
  received_at?: string
}

export async function POST(req: NextRequest) {
  let body: PaymentPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { amount, reference, provider } = body
  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })
  }
  if (!reference || typeof reference !== 'string') {
    return NextResponse.json({ error: 'reference is required' }, { status: 400 })
  }
  if (!['gcash', 'maya', 'gotyme'].includes(provider)) {
    return NextResponse.json({ error: 'provider must be gcash | maya | gotyme' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // Pull all currently-locked bookings whose lock has not yet expired.
  const { data: locked, error: fetchError } = await supabase
    .from('bookings')
    .select('reference, court_number, booking_date, start_time, duration, players, pay_mode, locked_until, status')
    .eq('status', 'locked')

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const now = new Date()
  const active = (locked || []).filter(b =>
    b.locked_until ? new Date(b.locked_until) > now : false
  )

  // Group by reference — multi-court bookings share a reference, total spans rows.
  const byReference = new Map<string, typeof active>()
  for (const row of active) {
    const list = byReference.get(row.reference) ?? []
    list.push(row)
    byReference.set(row.reference, list)
  }

  // Compute total for each reference and find candidates within tolerance.
  // Multi-range bookings have rows with distinct start_time/duration — sum per row.
  // pay_mode='onsite_entrance' means the ₱50/player entrance is paid at the front
  // desk on arrival, so the online total is court fee only.
  const candidates: { reference: string; total: number }[] = []
  for (const [ref, rows] of byReference) {
    const players = rows[0].players as number
    const date = rows[0].booking_date as string
    const payMode = (rows[0].pay_mode as string | null) === 'onsite_entrance' ? 'onsite_entrance' : 'online'
    const holidays = await getHolidays(parseInt(date.slice(0, 4)))
    let courtFee = 0
    for (const row of rows) {
      const startHour = parseInt((row.start_time as string).split(':')[0])
      courtFee += courtFeeFor(date, startHour, row.duration as number, 1, holidays)
    }
    const entrance = payMode === 'onsite_entrance' ? 0 : players * ENTRANCE_FEE_PER_PERSON
    const total = courtFee + entrance
    if (Math.abs(total - amount) <= AMOUNT_TOLERANCE) {
      candidates.push({ reference: ref, total })
    }
  }

  if (candidates.length === 0) {
    return NextResponse.json({
      result: 'no_match',
      reason: `No locked booking with total ≈ ₱${amount.toLocaleString()} (±${AMOUNT_TOLERANCE})`,
      checked: active.length,
    })
  }

  if (candidates.length > 1) {
    return NextResponse.json({
      result: 'ambiguous',
      reason: `${candidates.length} locked bookings match ₱${amount.toLocaleString()}. Manual review needed.`,
      candidates: candidates.map(c => c.reference),
    })
  }

  // Exactly one match → confirm.
  const matched = candidates[0]
  const { data: confirmedRows, error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'confirmed',
      payment_method: provider,
      payment_reference: reference,
      confirmed_at: new Date().toISOString(),
      locked_until: null,
    })
    .eq('reference', matched.reference)
    .eq('status', 'locked')
    .select()
    .order('court_number', { ascending: true })

  if (updateError || !confirmedRows || confirmedRows.length === 0) {
    return NextResponse.json({ error: updateError?.message || 'Confirm failed' }, { status: 500 })
  }

  const lead = confirmedRows[0]

  // Auto-insert booking_players ONCE per reference (idempotent).
  const { data: existingPlayers } = await supabase
    .from('booking_players')
    .select('id')
    .eq('booking_id', lead.id)
    .limit(1)

  const selections = confirmedRows.map(b => ({
    court_number: b.court_number,
    start_time: b.start_time,
    end_time: b.end_time,
    duration: b.duration,
  }))
  let insertedPlayers: { full_name: string | null; checkin_token: string }[] = []
  if (!existingPlayers || existingPlayers.length === 0) {
    const playerRows = Array.from({ length: lead.players }, (_, i) => ({
      booking_id: lead.id,
      full_name: lead.player_names?.[i] || (i === 0 ? lead.customer_name : null),
    }))
    const { data: newPlayers } = await supabase
      .from('booking_players')
      .insert(playerRows)
      .select('full_name, checkin_token')
    insertedPlayers = newPlayers || []
  }

  // Send notifications (non-blocking).
  Promise.allSettled([
    sendConfirmationEmail(lead, selections, insertedPlayers),
    sendConfirmationSMS(lead),
  ])

  return NextResponse.json({
    result: 'confirmed',
    reference: lead.reference,
    matched_amount: matched.total,
    paid_amount: amount,
    courts: confirmedRows.map(b => b.court_number),
    customer_name: lead.customer_name,
  })
}
