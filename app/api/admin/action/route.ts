import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { id, action, key } = await req.json()

  if (!key || key !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const status = action === 'approve' ? 'confirmed' : 'cancelled'
  const update: Record<string, string> = { status }
  if (action === 'approve') update.confirmed_at = new Date().toISOString()

  const { error } = await getSupabaseAdmin()
    .from('bookings')
    .update(update)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
