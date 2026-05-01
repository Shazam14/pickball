import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// POST /api/cancel-lock — { reference }
// Releases a still-locked booking when the user backs out of the details
// phase. Deletes only locked rows so a confirmed booking can never be
// destroyed by a stale client.
export async function POST(req: NextRequest) {
  let body: { reference?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const reference = body.reference?.trim()
  if (!reference) {
    return NextResponse.json({ error: 'reference is required' }, { status: 400 })
  }

  const { error } = await getSupabaseAdmin()
    .from('bookings')
    .delete()
    .eq('reference', reference)
    .eq('status', 'locked')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
