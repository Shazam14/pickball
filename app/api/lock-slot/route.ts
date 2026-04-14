import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { LockSlotRequest, LOCK_DURATION_MINUTES } from '@/lib/types'

// POST /api/lock-slot
export async function POST(req: NextRequest) {
  const body: LockSlotRequest = await req.json()
  const { court_number, booking_date, start_time, duration, players, customer_name, customer_phone, customer_email } = body

  if (!court_number || !booking_date || !start_time || !duration || !customer_name || !customer_phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const startHour = parseInt(start_time.split(':')[0])
  const endHour = startHour + duration
  const end_time = `${String(endHour).padStart(2, '0')}:00`
  const locked_until = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000).toISOString()

  // Check no confirmed/locked booking already exists for this slot
  const { data: conflicts } = await getSupabaseAdmin()
    .from('bookings')
    .select('id')
    .eq('court_number', court_number)
    .eq('booking_date', booking_date)
    .in('status', ['locked', 'confirmed'])
    .or(
      `and(start_time.lt.${end_time},end_time.gt.${start_time})`
    )
    .filter('status', 'eq', 'confirmed')

  // Also check non-expired locks
  const { data: activeLocks } = await getSupabaseAdmin()
    .from('bookings')
    .select('id')
    .eq('court_number', court_number)
    .eq('booking_date', booking_date)
    .eq('status', 'locked')
    .gt('locked_until', new Date().toISOString())

  const hasConflict = (conflicts && conflicts.length > 0) || (activeLocks && activeLocks.length > 0)
  if (hasConflict) {
    return NextResponse.json({ error: 'This slot was just taken. Please choose another.' }, { status: 409 })
  }

  // Generate reference
  const reference = 'SO-' + Date.now().toString().slice(-8)

  const { data: booking, error } = await getSupabaseAdmin()
    .from('bookings')
    .insert({
      reference,
      court_number,
      booking_date,
      start_time,
      end_time,
      duration,
      players,
      customer_name,
      customer_phone,
      customer_email: customer_email || null,
      status: 'locked',
      locked_until,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    booking_id: booking.id,
    reference: booking.reference,
    locked_until: booking.locked_until,
  })
}
