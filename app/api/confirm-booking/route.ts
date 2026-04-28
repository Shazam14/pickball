import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { ConfirmBookingRequest } from '@/lib/types'
import { sendConfirmationEmail, sendConfirmationSMS } from '@/lib/notifications'

// POST /api/confirm-booking
export async function POST(req: NextRequest) {
  const body: ConfirmBookingRequest = await req.json()
  const { booking_id, payment_method, payment_reference } = body

  if (!booking_id || !payment_method || !payment_reference) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Fetch booking and verify it's still locked and not expired
  const { data: booking, error: fetchError } = await getSupabaseAdmin()
    .from('bookings')
    .select('*')
    .eq('id', booking_id)
    .eq('status', 'locked')
    .single()

  if (fetchError || !booking) {
    return NextResponse.json({ error: 'Booking not found or already expired' }, { status: 404 })
  }

  if (new Date(booking.locked_until) < new Date()) {
    // Lock expired — mark as expired
    await getSupabaseAdmin()
      .from('bookings')
      .update({ status: 'expired' })
      .eq('id', booking_id)
    return NextResponse.json({ error: 'Booking lock expired. Please start over.' }, { status: 410 })
  }

  // Confirm the booking
  const { data: confirmed, error: updateError } = await getSupabaseAdmin()
    .from('bookings')
    .update({
      status: 'confirmed',
      payment_method,
      payment_reference,
      confirmed_at: new Date().toISOString(),
      locked_until: null,
    })
    .eq('id', booking_id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Auto-create booking_players rows for QR gate passes.
  // Row 1: booker pre-filled. Rows 2..N: blank, filled via /booking/[ref]/players.
  const playerRows = Array.from({ length: confirmed.players }, (_, i) => ({
    booking_id: confirmed.id,
    full_name: i === 0 ? confirmed.customer_name : null,
  }))
  const { error: playersError } = await getSupabaseAdmin()
    .from('booking_players')
    .insert(playerRows)
  if (playersError) {
    // Booking is already confirmed; admin can backfill if this rare case hits.
    console.error('booking_players insert failed:', playersError)
  }

  // Send notifications (non-blocking)
  Promise.allSettled([
    sendConfirmationEmail(confirmed),
    sendConfirmationSMS(confirmed),
  ])

  return NextResponse.json({
    success: true,
    reference: confirmed.reference,
    booking: {
      court_number: confirmed.court_number,
      booking_date: confirmed.booking_date,
      start_time: confirmed.start_time,
      end_time: confirmed.end_time,
      customer_name: confirmed.customer_name,
      payment_method: confirmed.payment_method,
      duration: confirmed.duration,
      players: confirmed.players,
    },
  })
}
