import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

function authed(req: NextRequest, body?: { key?: string }) {
  const key = body?.key ?? req.nextUrl.searchParams.get('key')
  return Boolean(key && key === process.env.ADMIN_PASSWORD)
}

async function loadTicket(token: string) {
  const sb = getSupabaseAdmin()
  const { data: ticket, error } = await sb
    .from('walkin_tickets')
    .select('id, token, ticket_index, coupon_redeemed_at, redeemed_by, walkin_id')
    .eq('token', token)
    .maybeSingle()
  if (error) return { error: error.message, status: 500 as const }
  if (!ticket) return { error: 'Ticket not found', status: 404 as const }
  const { data: walkin } = await sb
    .from('walkins')
    .select('id, reference, party_size, paid_amount_php, created_at, created_by')
    .eq('id', ticket.walkin_id)
    .single()
  return { ticket, walkin }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!authed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { token } = await params
  const result = await loadTicket(token)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result)
}

type RedeemBody = { key?: string; redeemed_by?: string }

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const body: RedeemBody = await req.json().catch(() => ({}))
  if (!authed(req, body)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { token } = await params

  const result = await loadTicket(token)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })

  if (result.ticket.coupon_redeemed_at) {
    return NextResponse.json(
      {
        error: 'Already redeemed',
        coupon_redeemed_at: result.ticket.coupon_redeemed_at,
        redeemed_by: result.ticket.redeemed_by,
      },
      { status: 409 }
    )
  }

  const sb = getSupabaseAdmin()
  const { data: updated, error: uErr } = await sb
    .from('walkin_tickets')
    .update({
      coupon_redeemed_at: new Date().toISOString(),
      redeemed_by: body.redeemed_by ?? null,
    })
    .eq('id', result.ticket.id)
    .is('coupon_redeemed_at', null)             // race-safe: rejects double-tap
    .select('id, coupon_redeemed_at, redeemed_by')
    .maybeSingle()

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })
  if (!updated) {
    return NextResponse.json({ error: 'Already redeemed' }, { status: 409 })
  }

  return NextResponse.json({ ok: true, ticket: { ...result.ticket, ...updated } })
}
