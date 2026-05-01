import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { LockSlotRequest, LockSlotRange, LOCK_DURATION_MINUTES } from '@/lib/types'

// POST /api/lock-slot
export async function POST(req: NextRequest) {
  const body: LockSlotRequest = await req.json()
  const { booking_date, players, customer_name, customer_phone, customer_email, player_names } = body

  if (!booking_date || !customer_name || !customer_phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Normalize input → ranges[]. Either accept the new ranges field,
  // or expand the legacy court_numbers + start_time + duration body.
  let ranges: LockSlotRange[] = []
  if (Array.isArray(body.ranges) && body.ranges.length > 0) {
    ranges = body.ranges
  } else if (
    Array.isArray(body.court_numbers) &&
    body.court_numbers.length > 0 &&
    body.start_time &&
    body.duration
  ) {
    const st = body.start_time
    const dur = body.duration
    ranges = body.court_numbers.map(c => ({ court_number: c, start_time: st, duration: dur }))
  } else {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Compute end_time per range.
  const ranges2 = ranges.map(r => {
    const startHour = parseInt(r.start_time.split(':')[0])
    const endHour = startHour + r.duration
    return { ...r, end_time: `${String(endHour).padStart(2, '0')}:00` }
  })

  const locked_until = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000).toISOString()
  const nowIso = new Date().toISOString()

  // Conflict check: fetch all locked/confirmed bookings on this date for the courts we want,
  // then JS-side check whether any existing row overlaps any requested range on the same court.
  const courts = Array.from(new Set(ranges2.map(r => r.court_number)))
  const { data: existing, error: conflictError } = await getSupabaseAdmin()
    .from('bookings')
    .select('court_number, start_time, end_time, status, locked_until')
    .in('court_number', courts)
    .eq('booking_date', booking_date)
    .in('status', ['locked', 'confirmed'])

  if (conflictError) {
    return NextResponse.json({ error: conflictError.message }, { status: 500 })
  }

  const active = (existing ?? []).filter(r =>
    r.status === 'confirmed' || (r.locked_until && r.locked_until > nowIso)
  )
  const hasConflict = ranges2.some(req =>
    active.some(ex =>
      ex.court_number === req.court_number &&
      ex.start_time < req.end_time &&
      ex.end_time > req.start_time
    )
  )
  if (hasConflict) {
    return NextResponse.json({ error: 'One of the selected courts was just taken. Please choose another.' }, { status: 409 })
  }

  // Single shared reference across all rows.
  const reference = 'SO-' + Date.now().toString().slice(-8)

  const rows = ranges2.map(r => ({
    reference,
    court_number: r.court_number,
    booking_date,
    start_time: r.start_time,
    end_time: r.end_time,
    duration: r.duration,
    players,
    customer_name,
    customer_phone,
    customer_email: customer_email || null,
    player_names: player_names || null,
    status: 'locked' as const,
    locked_until,
  }))

  const { error } = await getSupabaseAdmin().from('bookings').insert(rows)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    reference,
    locked_until,
    court_numbers: courts,
    ranges: ranges2.map(({ court_number, start_time, duration }) => ({ court_number, start_time, duration })),
  })
}
