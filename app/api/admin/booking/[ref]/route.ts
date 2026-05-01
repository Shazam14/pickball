import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { Booking, OPEN_HOUR, CLOSE_HOUR } from '@/lib/types'
import { sendConfirmationEmail } from '@/lib/notifications'

function authed(req: NextRequest, body?: { key?: string }) {
  const key = body?.key ?? req.nextUrl.searchParams.get('key')
  return Boolean(key && key === process.env.ADMIN_PASSWORD)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  if (!authed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { ref } = await params

  const sb = getSupabaseAdmin()

  const { data: rows, error: rowErr } = await sb
    .from('bookings')
    .select('*')
    .eq('reference', ref)
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (rowErr) return NextResponse.json({ error: rowErr.message }, { status: 500 })
  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const ids = rows.map(r => r.id)
  const { data: players } = await sb
    .from('booking_players')
    .select('*')
    .in('booking_id', ids)
    .order('created_at', { ascending: true })

  const { data: audit } = await sb
    .from('booking_audit')
    .select('*')
    .eq('booking_reference', ref)
    .order('edited_at', { ascending: false })
    .limit(50)

  return NextResponse.json({
    rows,
    players: players ?? [],
    audit: audit ?? [],
  })
}

type RowEdit = {
  id: string
  court_number?: number
  booking_date?: string
  start_time?: string
  duration?: number
}

type PatchBody = {
  key?: string
  edited_by?: string
  notes?: string
  customer_name?: string
  customer_phone?: string
  customer_email?: string
  players?: number
  pay_mode?: 'online' | 'onsite_entrance'
  payment_method?: 'gcash' | 'maya' | 'gotyme'
  rows?: RowEdit[]
}

function endTime(start: string, duration: number): string {
  const [h, m] = start.split(':').map(Number)
  const eh = h + duration
  return `${String(eh).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')}`
}

function expandHours(start: string, duration: number): number[] {
  const h = parseInt(start.split(':')[0])
  return Array.from({ length: duration }, (_, i) => h + i)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const body: PatchBody = await req.json()
  if (!authed(req, body)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { ref } = await params

  const sb = getSupabaseAdmin()

  const { data: existing, error: fetchErr } = await sb
    .from('bookings')
    .select('*')
    .eq('reference', ref)

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!existing || existing.length === 0) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const refLevelUpdate: Record<string, unknown> = {}
  if (body.customer_name !== undefined) refLevelUpdate.customer_name = body.customer_name
  if (body.customer_phone !== undefined) refLevelUpdate.customer_phone = body.customer_phone
  if (body.customer_email !== undefined) refLevelUpdate.customer_email = body.customer_email
  if (body.players !== undefined) refLevelUpdate.players = body.players
  if (body.pay_mode !== undefined) refLevelUpdate.pay_mode = body.pay_mode
  if (body.payment_method !== undefined) refLevelUpdate.payment_method = body.payment_method

  const rowEdits = Array.isArray(body.rows) ? body.rows : []

  // Validate per-row edits + run conflict checks against bookings outside this reference.
  for (const edit of rowEdits) {
    const cur = existing.find(r => r.id === edit.id)
    if (!cur) {
      return NextResponse.json({ error: `Row ${edit.id} not in reference ${ref}` }, { status: 400 })
    }
    const next = {
      court_number: edit.court_number ?? cur.court_number,
      booking_date: edit.booking_date ?? cur.booking_date,
      start_time: edit.start_time ?? cur.start_time,
      duration: edit.duration ?? cur.duration,
    }
    const startH = parseInt(next.start_time.split(':')[0])
    if (
      isNaN(startH) ||
      startH < OPEN_HOUR ||
      next.duration < 1 ||
      startH + next.duration > CLOSE_HOUR
    ) {
      return NextResponse.json(
        { error: `Invalid time/duration for row ${edit.id}: ${next.start_time} +${next.duration}h (open ${OPEN_HOUR}–${CLOSE_HOUR})` },
        { status: 400 }
      )
    }

    const hours = expandHours(next.start_time, next.duration)
    const { data: conflicts } = await sb
      .from('bookings')
      .select('id, reference, court_number, start_time, duration, booking_date, status')
      .eq('booking_date', next.booking_date)
      .eq('court_number', next.court_number)
      .in('status', ['locked', 'confirmed'])
      .neq('reference', ref)

    if (conflicts && conflicts.length > 0) {
      const collision = conflicts.find(c => {
        const cHours = expandHours(c.start_time, c.duration)
        return cHours.some(h => hours.includes(h))
      })
      if (collision) {
        return NextResponse.json(
          {
            error: 'Time conflict',
            conflict: {
              reference: collision.reference,
              court_number: collision.court_number,
              start_time: collision.start_time,
              duration: collision.duration,
            },
          },
          { status: 409 }
        )
      }
    }
  }

  // Apply reference-level update across all rows.
  if (Object.keys(refLevelUpdate).length > 0) {
    const { error: refErr } = await sb
      .from('bookings')
      .update(refLevelUpdate)
      .eq('reference', ref)
    if (refErr) return NextResponse.json({ error: refErr.message }, { status: 500 })
  }

  // Apply per-row updates.
  for (const edit of rowEdits) {
    const cur = existing.find(r => r.id === edit.id)!
    const next: Record<string, unknown> = {}
    if (edit.court_number !== undefined) next.court_number = edit.court_number
    if (edit.booking_date !== undefined) next.booking_date = edit.booking_date
    if (edit.start_time !== undefined) next.start_time = edit.start_time
    if (edit.duration !== undefined) next.duration = edit.duration
    if (edit.start_time !== undefined || edit.duration !== undefined) {
      const start = edit.start_time ?? cur.start_time
      const dur = edit.duration ?? cur.duration
      next.end_time = endTime(start, dur)
    }
    if (Object.keys(next).length === 0) continue

    const { error: rowErr } = await sb
      .from('bookings')
      .update(next)
      .eq('id', edit.id)
    if (rowErr) return NextResponse.json({ error: rowErr.message }, { status: 500 })
  }

  // Audit row.
  await sb.from('booking_audit').insert({
    booking_reference: ref,
    edited_by: body.edited_by ?? null,
    action: 'edit',
    before: { rows: existing },
    after: { ref_update: refLevelUpdate, row_edits: rowEdits },
    notes: body.notes ?? null,
  })

  // Re-send confirmation email if any row is confirmed and we have an email.
  const { data: updated } = await sb
    .from('bookings')
    .select('*')
    .eq('reference', ref)

  const confirmedRows = (updated ?? []).filter(r => r.status === 'confirmed') as Booking[]
  if (confirmedRows.length > 0 && confirmedRows[0].customer_email) {
    const courts = confirmedRows.map(r => r.court_number).sort((a, b) => a - b)
    const { data: playerRows } = await sb
      .from('booking_players')
      .select('full_name, checkin_token')
      .in('booking_id', confirmedRows.map(r => r.id))
    try {
      await sendConfirmationEmail(confirmedRows[0], courts, playerRows ?? [])
    } catch (e) {
      // Don't fail the edit if email send fails — surface it to the client.
      return NextResponse.json({
        ok: true,
        rows: updated,
        email_warning: e instanceof Error ? e.message : 'email send failed',
      })
    }
  }

  return NextResponse.json({ ok: true, rows: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const body = await req.json().catch(() => ({}))
  if (!authed(req, body)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { ref } = await params

  const sb = getSupabaseAdmin()
  const { data: existing, error: fetchErr } = await sb
    .from('bookings')
    .select('*')
    .eq('reference', ref)
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!existing || existing.length === 0) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const { error: voidErr } = await sb
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('reference', ref)
  if (voidErr) return NextResponse.json({ error: voidErr.message }, { status: 500 })

  await sb.from('booking_audit').insert({
    booking_reference: ref,
    edited_by: body.edited_by ?? null,
    action: 'void',
    before: { rows: existing },
    after: { status: 'cancelled' },
    notes: body.notes ?? null,
  })

  return NextResponse.json({ ok: true })
}
