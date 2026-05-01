import Link from 'next/link'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type BookingRow = {
  id: string
  reference: string
  court_number: number
  booking_date: string
  start_time: string
  end_time: string
  customer_name: string
}
type PlayerRow = {
  id: string
  full_name: string | null
  checkin_token: string
  checked_in_at: string | null
}

function fmtDate(iso: string) {
  const d = new Date(`${iso}T00:00:00+08:00`)
  return d.toLocaleDateString('en-PH', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Manila',
  })
}
function fmtClock(t: string) {
  const [hh, mm] = t.split(':')
  const h = parseInt(hh)
  const ap = h >= 12 ? 'PM' : 'AM'
  const h12 = ((h + 11) % 12) + 1
  return `${h12}:${mm} ${ap}`
}
function fmtCheckedIn(iso: string) {
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    hour12: true, timeZone: 'Asia/Manila',
  })
}

export default async function CheckinDemoPage() {
  const todayManila = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
  const todayISO = `${todayManila.getFullYear()}-${String(todayManila.getMonth() + 1).padStart(2, '0')}-${String(todayManila.getDate()).padStart(2, '0')}`

  const { data: bookings } = await getSupabaseAdmin()
    .from('bookings')
    .select('id, reference, court_number, booking_date, start_time, end_time, customer_name')
    .eq('status', 'confirmed')
    .gte('booking_date', todayISO)
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true })
    .order('court_number', { ascending: true })

  const rows = (bookings ?? []) as BookingRow[]

  // Group by reference, keep lead row (lowest court_number) and aggregate court list.
  const grouped = new Map<string, { lead: BookingRow; courts: number[] }>()
  for (const b of rows) {
    const g = grouped.get(b.reference)
    if (!g) {
      grouped.set(b.reference, { lead: b, courts: [b.court_number] })
    } else {
      g.courts.push(b.court_number)
      if (b.court_number < g.lead.court_number) g.lead = b
    }
  }

  // Fetch players for all lead booking ids in one query.
  const leadIds = Array.from(grouped.values()).map(g => g.lead.id)
  let playersByBooking = new Map<string, PlayerRow[]>()
  if (leadIds.length > 0) {
    const { data: players } = await getSupabaseAdmin()
      .from('booking_players')
      .select('id, full_name, checkin_token, checked_in_at, booking_id')
      .in('booking_id', leadIds)
      .order('created_at', { ascending: true })
    for (const p of (players ?? []) as (PlayerRow & { booking_id: string })[]) {
      const list = playersByBooking.get(p.booking_id) ?? []
      list.push(p)
      playersByBooking.set(p.booking_id, list)
    }
  }

  const groups = Array.from(grouped.values())

  return (
    <div style={{
      maxWidth: 1100, margin: '0 auto', padding: '32px 20px 80px',
      fontFamily: 'var(--font-barlow-condensed), sans-serif', color: '#fff',
      minHeight: '100vh', background: '#0a0a0a',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <Link href="/admin" style={{ color: '#9ca3af', textDecoration: 'underline', fontSize: 13 }}>← /admin</Link>
        <span style={{ fontSize: 11, letterSpacing: 2, color: '#fbbf24' }}>DEMO MODE — open any /checkin/[token]</span>
      </div>
      <h1 style={{ fontSize: 32, letterSpacing: 1, marginBottom: 4 }}>QR CHECK-IN TEST</h1>
      <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 24, maxWidth: 700, lineHeight: 1.5 }}>
        Confirmed bookings from today onward. Click any player to open their check-in screen
        (the same URL their QR points to). Entry window opens 30 min before start time.
      </p>

      {groups.length === 0 && (
        <div style={{ padding: 40, border: '1px dashed #374151', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
          No confirmed bookings from today onward. Confirm one in /booking first.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {groups.map(({ lead, courts }) => {
          const players = playersByBooking.get(lead.id) ?? []
          const courtsLabel = courts.sort((a, b) => a - b).map(c => `SO${c}`).join(', ')
          return (
            <section key={lead.reference} style={{
              background: '#111', border: '1px solid #1f2937', padding: '18px 22px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1, color: '#22c55e' }}>{lead.customer_name}</span>
                  <span style={{ marginLeft: 12, color: '#9ca3af', fontSize: 13 }}>
                    {fmtDate(lead.booking_date)} · {fmtClock(lead.start_time)} – {fmtClock(lead.end_time)} · {courtsLabel}
                  </span>
                </div>
                <span style={{ fontSize: 11, letterSpacing: 2, color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>
                  {lead.reference}
                </span>
              </div>

              {players.length === 0 ? (
                <div style={{ color: '#6b7280', fontSize: 12, fontStyle: 'italic' }}>No player records (booking confirmed before player capture wired up).</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {players.map((p, i) => {
                    const checkedIn = !!p.checked_in_at
                    return (
                      <div key={p.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 12px', background: '#0a0a0a',
                        border: `1px solid ${checkedIn ? '#22c55e40' : '#1f2937'}`,
                      }}>
                        <span style={{ fontSize: 11, color: '#6b7280', minWidth: 18 }}>#{i + 1}</span>
                        <span style={{ fontSize: 14, color: '#fff', flex: 1 }}>
                          {p.full_name || <em style={{ color: '#6b7280' }}>(no name)</em>}
                        </span>
                        {checkedIn ? (
                          <span style={{ fontSize: 11, color: '#22c55e', letterSpacing: 1.5 }}>
                            ✓ {fmtCheckedIn(p.checked_in_at!)}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#9ca3af', letterSpacing: 1.5 }}>NOT CHECKED IN</span>
                        )}
                        <Link
                          href={`/checkin/${p.checkin_token}`}
                          target="_blank"
                          style={{
                            fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
                            padding: '6px 10px', background: '#22c55e', color: '#000',
                            textDecoration: 'none', fontWeight: 700,
                          }}
                        >
                          Open ↗
                        </Link>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
