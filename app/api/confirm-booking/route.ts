import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { ConfirmBookingRequest } from '@/lib/types'
import { sendConfirmationEmail, sendConfirmationSMS } from '@/lib/notifications'

// POST /api/confirm-booking
export async function POST(req: NextRequest) {
  const body: ConfirmBookingRequest = await req.json()
  const { reference, payment_method, payment_reference } = body

  if (!reference || !payment_method || !payment_reference) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Fetch all rows for this reference (multi-court bookings share a reference).
  const { data: locked, error: fetchError } = await getSupabaseAdmin()
    .from('bookings')
    .select('*')
    .eq('reference', reference)
    .eq('status', 'locked')
    .order('court_number', { ascending: true })

  if (fetchError || !locked || locked.length === 0) {
    return NextResponse.json({ error: 'Booking not found or already expired' }, { status: 404 })
  }

  // Lock expiry — all rows share the same locked_until from lock-slot.
  const lockedUntil = locked[0].locked_until
  if (lockedUntil && new Date(lockedUntil) < new Date()) {
    await getSupabaseAdmin()
      .from('bookings')
      .update({ status: 'expired' })
      .eq('reference', reference)
      .eq('status', 'locked')
    return NextResponse.json({ error: 'Booking lock expired. Please start over.' }, { status: 410 })
  }

  // Confirm all rows in one update.
  const { data: confirmedRows, error: updateError } = await getSupabaseAdmin()
    .from('bookings')
    .update({
      status: 'confirmed',
      payment_method,
      payment_reference,
      confirmed_at: new Date().toISOString(),
      locked_until: null,
    })
    .eq('reference', reference)
    .eq('status', 'locked')
    .select()
    .order('court_number', { ascending: true })

  if (updateError || !confirmedRows || confirmedRows.length === 0) {
    return NextResponse.json({ error: updateError?.message || 'Confirm failed' }, { status: 500 })
  }

  const lead = confirmedRows[0]
  const courtNumbers = confirmedRows.map(b => b.court_number)

  // Auto-create booking_players rows ONCE per reference (not per court).
  // Anchor to the lead row (lowest court_number). Skip if already inserted.
  const { data: existingPlayers } = await getSupabaseAdmin()
    .from('booking_players')
    .select('id')
    .eq('booking_id', lead.id)
    .limit(1)

  if (!existingPlayers || existingPlayers.length === 0) {
    const playerRows = Array.from({ length: lead.players }, (_, i) => ({
      booking_id: lead.id,
      full_name: i === 0 ? lead.customer_name : null,
    }))
    const { error: playersError } = await getSupabaseAdmin()
      .from('booking_players')
      .insert(playerRows)
    if (playersError) {
      console.error('booking_players insert failed:', playersError)
    }
  }

  // Send notifications ONCE per reference (non-blocking).
  Promise.allSettled([
    sendConfirmationEmail(lead),
    sendConfirmationSMS(lead),
  ])

  return NextResponse.json({
    success: true,
    reference: lead.reference,
    booking: {
      court_numbers: courtNumbers,
      booking_date: lead.booking_date,
      start_time: lead.start_time,
      end_time: lead.end_time,
      customer_name: lead.customer_name,
      payment_method: lead.payment_method,
      duration: lead.duration,
      players: lead.players,
    },
  })
}
