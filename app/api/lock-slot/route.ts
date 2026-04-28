import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { LockSlotRequest, LOCK_DURATION_MINUTES } from '@/lib/types'

// POST /api/lock-slot
export async function POST(req: NextRequest) {
  const body: LockSlotRequest = await req.json()
  const { court_numbers, booking_date, start_time, duration, players, customer_name, customer_phone, customer_email } = body

  if (!Array.isArray(court_numbers) || court_numbers.length === 0 || !booking_date || !start_time || !duration || !customer_name || !customer_phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const startHour = parseInt(start_time.split(':')[0])
  const endHour = startHour + duration
  const end_time = `${String(endHour).padStart(2, '0')}:00`
  const locked_until = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000).toISOString()
  const nowIso = new Date().toISOString()

  // Conflict check across ALL requested courts (all-or-nothing).
  // Confirmed bookings or active (non-expired) locks that overlap the time window.
  const { data: conflicts, error: conflictError } = await getSupabaseAdmin()
    .from('bookings')
    .select('court_number, status, locked_until')
    .in('court_number', court_numbers)
    .eq('booking_date', booking_date)
    .in('status', ['locked', 'confirmed'])
    .lt('start_time', end_time)
    .gt('end_time', start_time)

  if (conflictError) {
    return NextResponse.json({ error: conflictError.message }, { status: 500 })
  }

  const hasConflict = (conflicts ?? []).some(c =>
    c.status === 'confirmed' || (c.locked_until && c.locked_until > nowIso)
  )
  if (hasConflict) {
    return NextResponse.json({ error: 'One of the selected courts was just taken. Please choose another.' }, { status: 409 })
  }

  // Single shared reference across all rows.
  const reference = 'SO-' + Date.now().toString().slice(-8)

  const rows = court_numbers.map(c => ({
    reference,
    court_number: c,
    booking_date,
    start_time,
    end_time,
    duration,
    players,
    customer_name,
    customer_phone,
    customer_email: customer_email || null,
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
    court_numbers,
  })
}
