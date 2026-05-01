import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type Booking = {
  booking_date: string
  start_time: string
  end_time: string
  court_number: number
  customer_name: string
  status: string
  reference: string
}
type Player = {
  id: string
  full_name: string | null
  checked_in_at: string | null
  bookings: Booking | Booking[] | null
}

function manilaDate(date: string, time: string) {
  return new Date(`${date}T${time}+08:00`)
}

function fmtTime(d: Date) {
  return d.toLocaleString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila',
  })
}

function unwrapBooking(b: Booking | Booking[] | null): Booking | null {
  if (!b) return null
  return Array.isArray(b) ? b[0] ?? null : b
}

export default async function CheckinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const { data: rawPlayer } = await getSupabaseAdmin()
    .from('booking_players')
    .select('id, full_name, checked_in_at, bookings(booking_date, start_time, end_time, court_number, customer_name, status, reference)')
    .eq('checkin_token', token)
    .maybeSingle()

  const player = rawPlayer as Player | null

  if (!player) {
    return <Screen tone="error" title="Invalid QR" subtitle="This check-in link is not recognized." />
  }

  const booking = unwrapBooking(player.bookings)
  if (!booking) {
    return <Screen tone="error" title="Booking missing" subtitle="The booking linked to this QR no longer exists." />
  }

  if (booking.status !== 'confirmed') {
    return <Screen tone="warn" title="Not yet confirmed" subtitle="This booking has not been paid yet. Please complete payment first." />
  }

  const start = manilaDate(booking.booking_date, booking.start_time)
  const end = manilaDate(booking.booking_date, booking.end_time)
  // Generous entry window: 2h before start (cafe/lounge warm-up) → 2h after end
  // (post-game hangout). Total +4h beyond the booked court time.
  const windowOpen = new Date(start.getTime() - 2 * 60 * 60 * 1000)
  const windowClose = new Date(end.getTime() + 2 * 60 * 60 * 1000)
  const now = new Date()

  if (now < windowOpen) {
    return (
      <Screen
        tone="warn"
        title="Too early"
        subtitle={`Entry opens at ${fmtTime(windowOpen)} — 2 hours before your booking starts at ${fmtTime(start)}.`}
      />
    )
  }
  if (now > windowClose) {
    return (
      <Screen
        tone="warn"
        title="Access window closed"
        subtitle={`Your access ended at ${fmtTime(windowClose)} — 2 hours after your booking ended at ${fmtTime(end)}.`}
      />
    )
  }

  // Pull all courts on the same reference (multi-court bookings).
  const { data: courtRows } = await getSupabaseAdmin()
    .from('bookings')
    .select('court_number')
    .eq('reference', booking.reference)
    .eq('status', 'confirmed')
    .order('court_number', { ascending: true })

  const courts = (courtRows ?? [{ court_number: booking.court_number }])
    .map(r => `COURT ${r.court_number}`)
    .join(', ')

  const name = player.full_name || booking.customer_name

  if (player.checked_in_at) {
    const at = new Date(player.checked_in_at)
    return (
      <Screen
        tone="ok"
        title={`Welcome back, ${name}`}
        subtitle={`Checked in at ${fmtTime(at)} · ${courts}`}
      />
    )
  }

  await getSupabaseAdmin()
    .from('booking_players')
    .update({ checked_in_at: new Date().toISOString() })
    .eq('id', player.id)

  return (
    <Screen
      tone="ok"
      title={`Welcome, ${name}`}
      subtitle={`${courts} · ${fmtTime(start)} – ${fmtTime(end)}`}
    />
  )
}

function Screen({ tone, title, subtitle }: { tone: 'ok' | 'warn' | 'error'; title: string; subtitle: string }) {
  const palette = {
    ok: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.4)', accent: '#22c55e', icon: '✓' },
    warn: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.4)', accent: '#f59e0b', icon: '!' },
    error: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.4)', accent: '#ef4444', icon: '×' },
  }[tone]
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        color: '#fff',
      }}
    >
      <div
        style={{
          background: palette.bg,
          border: `1px solid ${palette.border}`,
          padding: '40px 28px',
          maxWidth: 380,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            border: `2px solid ${palette.accent}`,
            color: palette.accent,
            fontSize: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            lineHeight: 1,
          }}
        >
          {palette.icon}
        </div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            margin: '0 0 12px',
            letterSpacing: 0.3,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.7)',
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          {subtitle}
        </p>
      </div>
    </main>
  )
}
