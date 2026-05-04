import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { WALKIN_FEE_PHP } from '@/lib/walkin-config'

function authed(req: NextRequest, body?: { key?: string }) {
  const key = body?.key ?? req.nextUrl.searchParams.get('key')
  return Boolean(key && key === process.env.ADMIN_PASSWORD)
}

type CreateBody = {
  key?: string
  party_size: number
  created_by?: string
}

export async function POST(req: NextRequest) {
  const body: CreateBody = await req.json()
  if (!authed(req, body)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const partySize = Number(body.party_size)
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 20) {
    return NextResponse.json({ error: 'party_size must be 1-20' }, { status: 400 })
  }

  const sb = getSupabaseAdmin()
  const reference = 'WI-' + Date.now().toString().slice(-8)
  const paidAmount = partySize * WALKIN_FEE_PHP

  const { data: walkin, error: wErr } = await sb
    .from('walkins')
    .insert({
      reference,
      party_size: partySize,
      paid_amount_php: paidAmount,
      created_by: body.created_by ?? null,
    })
    .select('id, reference, party_size, paid_amount_php, created_at')
    .single()

  if (wErr || !walkin) {
    return NextResponse.json({ error: wErr?.message ?? 'insert failed' }, { status: 500 })
  }

  const ticketRows = Array.from({ length: partySize }, (_, i) => ({
    walkin_id: walkin.id,
    ticket_index: i + 1,
  }))

  const { data: tickets, error: tErr } = await sb
    .from('walkin_tickets')
    .insert(ticketRows)
    .select('id, token, ticket_index')
    .order('ticket_index', { ascending: true })

  if (tErr || !tickets) {
    return NextResponse.json({ error: tErr?.message ?? 'ticket insert failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, walkin, tickets })
}

// List today's walk-ins (Manila local day) for admin dashboard.
export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = getSupabaseAdmin()
  const since = new Date()
  since.setHours(0, 0, 0, 0)

  const { data: walkins, error: wErr } = await sb
    .from('walkins')
    .select('id, reference, party_size, paid_amount_php, created_at, created_by')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })

  if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 })

  const ids = (walkins ?? []).map(w => w.id)
  const { data: tickets } = ids.length
    ? await sb
        .from('walkin_tickets')
        .select('walkin_id, coupon_redeemed_at')
        .in('walkin_id', ids)
    : { data: [] as { walkin_id: string; coupon_redeemed_at: string | null }[] }

  const counts = new Map<string, { total: number; redeemed: number }>()
  for (const t of tickets ?? []) {
    const c = counts.get(t.walkin_id) ?? { total: 0, redeemed: 0 }
    c.total += 1
    if (t.coupon_redeemed_at) c.redeemed += 1
    counts.set(t.walkin_id, c)
  }

  return NextResponse.json({
    walkins: (walkins ?? []).map(w => ({
      ...w,
      tickets_total: counts.get(w.id)?.total ?? 0,
      tickets_redeemed: counts.get(w.id)?.redeemed ?? 0,
    })),
  })
}
