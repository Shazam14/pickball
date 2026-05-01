import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { TIME_SLOTS, TOTAL_COURTS, CLOSE_HOUR } from '@/lib/types'

// GET /api/availability?date=YYYY-MM-DD&duration=1
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const duration = parseInt(searchParams.get('duration') || '1')

  if (!date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 })
  }

  // Fetch all active bookings for this date
  const { data: bookings, error } = await getSupabaseAdmin()
    .from('bookings')
    .select('court_number, start_time, end_time, status, locked_until')
    .eq('booking_date', date)
    .in('status', ['locked', 'confirmed'])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const now = new Date()

  // Filter out expired locks
  const activeBookings = (bookings || []).filter(b => {
    if (b.status === 'confirmed') return true
    if (b.status === 'locked' && b.locked_until) {
      return new Date(b.locked_until) > now
    }
    return false
  })

  // Track confirmed (booked) and locked-not-expired (held) hours separately,
  // per court. A cell is "held" when an active lock covers it but no
  // confirmed booking does — useful for the matrix to show ⏱ instead of ×.
  const bookedSlots: Record<number, Set<string>> = {}
  const heldSlots: Record<number, Set<string>> = {}

  for (const b of activeBookings) {
    const target = b.status === 'confirmed' ? bookedSlots : heldSlots
    if (!target[b.court_number]) target[b.court_number] = new Set()
    const startHour = parseInt(b.start_time.split(':')[0])
    const endHour = parseInt(b.end_time.split(':')[0])
    for (let h = startHour; h < endHour; h++) {
      target[b.court_number].add(`${String(h).padStart(2, '0')}:00`)
    }
  }

  // For each time slot, check if selecting it (+ duration) would conflict
  const slots: Record<string, { court: number; available: boolean; held: boolean }[]> = {}

  for (const time of TIME_SLOTS) {
    const startHour = parseInt(time.split(':')[0])
    const endHour = startHour + duration
    if (endHour > CLOSE_HOUR) continue // past closing

    slots[time] = []
    for (let c = 1; c <= TOTAL_COURTS; c++) {
      let isBooked = false
      let isHeld = false
      for (let h = startHour; h < endHour; h++) {
        const key = `${String(h).padStart(2, '0')}:00`
        if (bookedSlots[c]?.has(key)) { isBooked = true; break }
        if (heldSlots[c]?.has(key)) { isHeld = true }
      }
      slots[time].push({ court: c, available: !isBooked && !isHeld, held: !isBooked && isHeld })
    }
  }

  return NextResponse.json({ slots })
}
