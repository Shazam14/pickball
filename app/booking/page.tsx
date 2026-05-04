'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import BookingModal from '@/components/BookingModal'
import { LobbyPlanButton } from '@/components/LobbyPlan'
import CourtHourMatrix, { type Slot } from './CourtHourMatrix'
import { TOTAL_COURTS, ENTRANCE_FEE_PER_PERSON, priceForHour, COURT_PRICE_PER_HOUR, COURT_PRICE_OFFPEAK } from '@/lib/types'
import { getSupabase } from '@/lib/supabase'
import styles from './booking.module.css'

interface LockData { reference: string; lockedUntil: string; courtNumbers: number[] }
interface SuccessData {
  reference: string
  ranges: { court_number: number; start_time: string; end_time: string }[]
  bookingDate: string
  price: number
  players: number
  customerName: string
  customerPhone: string
  customerEmail?: string
  payOnsite: boolean
  entranceFee: number
}

type SlotMatrix = Record<string, { court: number; available: boolean; held: boolean }[]>
type TimeStatus = 'available' | 'booked'

function getTimeStatus(time: string, slots: SlotMatrix): TimeStatus {
  if (!slots[time]) return 'available'
  const anyOpen = slots[time].some(s => s.available || s.held)
  return anyOpen ? 'available' : 'booked'
}

function formatTime(t: string) {
  const hr = parseInt(t.split(':')[0])
  if (hr === 0) return '12:00 AM'
  if (hr < 12) return `${hr}:00 AM`
  if (hr === 12) return '12:00 PM'
  return `${hr - 12}:00 PM`
}
function formatHour(h: number) {
  if (h === 0 || h === 24) return '12AM'
  if (h < 12) return `${h}AM`
  if (h === 12) return '12PM'
  return `${h - 12}PM`
}
function isoOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function today() { return isoOf(new Date()) }
function toTime(h: number) { return `${String(h).padStart(2,'0')}:00` }

const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MAX_DAYS_AHEAD = 60
const HOUR_MIN = 8
const HOUR_MAX = 24
const SLOTS_TOTAL = HOUR_MAX - HOUR_MIN

function buildMonthDays(year: number, month: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayD = new Date()
  const todayISO_ = isoOf(todayD)
  const isCurrentMonth = year === todayD.getFullYear() && month === todayD.getMonth()
  const startDay = isCurrentMonth ? todayD.getDate() : 1
  const out: { iso: string; day: number; dow: string; isToday: boolean }[] = []
  for (let d = startDay; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d)
    const iso = isoOf(dt)
    out.push({ iso, day: d, dow: DOW[dt.getDay()], isToday: iso === todayISO_ })
  }
  return out
}

// Group flat slot list into per-court ranges of consecutive hours.
function groupRanges(picks: Slot[]): { court: number; start: number; end: number }[] {
  const byCourt = new Map<number, number[]>()
  for (const p of picks) {
    const arr = byCourt.get(p.court) ?? []
    arr.push(p.hour)
    byCourt.set(p.court, arr)
  }
  const out: { court: number; start: number; end: number }[] = []
  for (const [court, hours] of byCourt) {
    const sorted = [...hours].sort((a, b) => a - b)
    let start = sorted[0]
    let end = sorted[0]
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i]
      } else {
        out.push({ court, start, end })
        start = sorted[i]
        end = sorted[i]
      }
    }
    out.push({ court, start, end })
  }
  return out.sort((a, b) => a.court - b.court || a.start - b.start)
}

function RateGuide({ date, holidays, picks }: { date: string; holidays: Set<string>; picks: Slot[] }) {
  const d = new Date(date + 'T00:00:00')
  const dow = d.getDay()
  const isWeekend = dow === 0 || dow === 6
  const isHoliday = holidays.has(date)
  const isFlatDay = isWeekend || isHoliday

  const hasOffpeakPick = picks.some(p => p.hour < 16)
  const hasPeakPick = picks.some(p => p.hour >= 16)

  const ctxLabel = isHoliday ? `${DOW[dow].toUpperCase()} · HOLIDAY`
    : isWeekend ? `${DOW[dow].toUpperCase()} · WEEKEND`
    : `${DOW[dow].toUpperCase()} · WEEKDAY`

  const tiers = [
    { key: 'weekday-am', label: 'Weekday',          meta: 'Mon–Fri · 8AM–4PM',  price: COURT_PRICE_OFFPEAK,  active: !isFlatDay && hasOffpeakPick },
    { key: 'weekday-pm', label: 'Weekday',          meta: 'Mon–Fri · 4PM–12AM', price: COURT_PRICE_PER_HOUR, active: !isFlatDay && hasPeakPick },
    { key: 'flat',       label: 'Weekend / Holiday', meta: 'Sat–Sun · PH/Cebu',  price: COURT_PRICE_PER_HOUR, active: isFlatDay && picks.length > 0 },
  ]

  return (
    <div className={styles.rateGuide}>
      <div className={styles.rateGuideHead}>
        <div className={styles.sectionLabel} style={{ marginBottom: 0 }}>Rate Guide</div>
        <div className={styles.rateGuideHeadCtx}>Selected: <strong>{ctxLabel}</strong></div>
      </div>
      <div className={styles.rateChips}>
        {tiers.map(t => (
          <div key={t.key} className={`${styles.rateChip} ${t.active ? styles.rateChipActive : ''}`}>
            <span className={styles.rateChipDot} />
            <div className={styles.rateChipBody}>
              <div className={styles.rateChipLabel}>{t.label}</div>
              <div className={styles.rateChipMeta}>{t.meta}</div>
            </div>
            <div className={styles.rateChipPrice}>₱{t.price}<span>/hr</span></div>
          </div>
        ))}
      </div>
      <div className={styles.rateGuideFoot}>
        + ₱{ENTRANCE_FEE_PER_PERSON} entrance per player · <strong>Open daily 8AM–12AM</strong>
      </div>
    </div>
  )
}

// Compact countdown shown in the details phase header. The big timer in the
// modal handles the same lock with the same lockedUntil — both stay in sync.
function HoldBadge({ lockedUntil, onExpire }: { lockedUntil: string; onExpire: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(0)
  useEffect(() => {
    const calc = () => Math.max(0, Math.floor((new Date(lockedUntil).getTime() - Date.now()) / 1000))
    setSecondsLeft(calc())
    const id = setInterval(() => {
      const s = calc()
      setSecondsLeft(s)
      if (s === 0) { clearInterval(id); onExpire() }
    }, 1000)
    return () => clearInterval(id)
  }, [lockedUntil, onExpire])
  const m = Math.floor(secondsLeft / 60)
  const s = secondsLeft % 60
  const urgent = secondsLeft <= 60
  return (
    <div className={`${styles.holdBadge} ${urgent ? styles.holdBadgeUrgent : ''}`}>
      <span>⏱ Hold</span>
      <span className={styles.holdBadgeTime}>
        {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </span>
    </div>
  )
}

export default function ConceptDBookingPage() {
  const [date, setDate] = useState(today())
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const [slots, setSlots] = useState<SlotMatrix>({})
  const [loading, setLoading] = useState(false)
  const [picks, setPicks] = useState<Slot[]>([])
  const [players, setPlayers] = useState(1)
  const [payOnsite, setPayOnsite] = useState(false)
  const [holidays, setHolidays] = useState<Set<string>>(new Set())
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [playerNames, setPlayerNames] = useState<string[]>(() => [])
  const [phase, setPhase] = useState<'review' | 'details'>('review')
  const [locking, setLocking] = useState(false)
  const [lockError, setLockError] = useState('')
  const [lockData, setLockData] = useState<LockData | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [success, setSuccess] = useState<SuccessData | null>(null)

  const formValid =
    customerName.trim().length > 0 &&
    customerPhone.trim().length > 0 &&
    customerEmail.trim().length > 0 &&
    (payOnsite || playerNames.every(n => n.trim().length > 0))

  // Keep playerNames length in sync with players (preserves typed values).
  useEffect(() => {
    setPlayerNames(prev => Array.from({ length: Math.max(0, players - 1) }, (_, i) => prev[i] ?? ''))
  }, [players])

  // Snap back to review if all picks cleared.
  useEffect(() => {
    if (picks.length === 0) setPhase('review')
  }, [picks.length])

  const totalHours = picks.length
  const courtFee = picks.reduce((sum, p) => sum + priceForHour(date, p.hour, holidays), 0)
  const entranceFee = players * ENTRANCE_FEE_PER_PERSON
  const onlineDue = courtFee + (payOnsite ? 0 : entranceFee)
  const numCourts = new Set(picks.map(p => p.court)).size
  const amHours = picks.filter(p => p.hour < 12).length
  const pmHours = picks.filter(p => p.hour >= 12).length
  const showAmPmBreakdown = amHours > 0 && pmHours > 0

  // Per-date cache + race-protection. cacheRef survives renders.
  const cacheRef = useRef<Map<string, SlotMatrix>>(new Map())
  const currentDateRef = useRef(date)
  useEffect(() => { currentDateRef.current = date }, [date])

  const fetchAvailability = useCallback(async (d: string, opts?: { background?: boolean }) => {
    const cached = cacheRef.current.get(d)
    if (cached && currentDateRef.current === d) {
      setSlots(cached)
    }
    if (!cached && !opts?.background) setLoading(true)
    try {
      const res = await fetch(`/api/availability?date=${d}&duration=1`)
      const data = await res.json()
      const fresh: SlotMatrix = data.slots || {}
      cacheRef.current.set(d, fresh)
      if (currentDateRef.current === d) setSlots(fresh)
    } finally {
      if (!opts?.background) setLoading(false)
    }
  }, [])

  // Browser back: stay inside /booking. Map history state to in-page step.
  // Reading `lockData` via ref so this listener doesn't need to be re-bound
  // every time the lock changes.
  const lockDataRef = useRef<LockData | null>(null)
  useEffect(() => { lockDataRef.current = lockData }, [lockData])

  useEffect(() => {
    function onPop(e: PopStateEvent) {
      const step = (e.state as { step?: string } | null)?.step
      if (step === 'details') {
        // Popped 'modal' → back to details. Modal closes, lock keeps ticking.
        setShowModal(false)
        return
      }
      // Popped 'details' (or initial entry) → back to review. Release the
      // lock so the user can re-pick the same slots immediately.
      setShowModal(false)
      setPhase('review')
      setSuccess(null)
      const live = lockDataRef.current
      if (live) {
        setLockData(null)
        fetch('/api/cancel-lock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference: live.reference }),
        })
          .catch(() => {})
          .finally(() => {
            cacheRef.current.delete(date)
            fetchAvailability(date, { background: true })
          })
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [date, fetchAvailability])

  // User date change: clear picks, fetch (cache-first).
  useEffect(() => {
    setPicks([])
    fetchAvailability(date)
  }, [date, fetchAvailability])

  // On mount: fetch holidays for current + next year.
  useEffect(() => {
    const thisYear = new Date().getFullYear()
    Promise.all([
      fetch(`/api/holidays?year=${thisYear}`).then(r => r.json()),
      fetch(`/api/holidays?year=${thisYear + 1}`).then(r => r.json()),
    ]).then(([a, b]) => {
      setHolidays(new Set<string>([...(a.dates || []), ...(b.dates || [])]))
    }).catch(() => {})
  }, [])

  // On mount: prefetch today + 6 upcoming days.
  useEffect(() => {
    const start = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
      const iso = isoOf(d)
      if (!cacheRef.current.has(iso)) {
        fetchAvailability(iso, { background: true })
      }
    }
  }, [fetchAvailability])

  const channelRef = useRef<ReturnType<typeof getSupabase>['channel'] extends (...args: any[]) => infer R ? R : never | null>(null)
  useEffect(() => {
    const supabase = getSupabase()
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    channelRef.current = supabase
      .channel(`bookings:${date}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `booking_date=eq.${date}` },
        () => {
          cacheRef.current.delete(date)
          fetchAvailability(date, { background: true })
        }
      )
      .subscribe()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [date, fetchAvailability])

  const isSlotTaken = (court: number, time: string) => {
    const cell = slots[time]?.find(s => s.court === court)
    if (!cell) return false
    return !cell.available
  }
  const isSlotHeld = (court: number, time: string) =>
    slots[time]?.find(s => s.court === court)?.held ?? false

  const isCellSelected = (court: number, hour: number) =>
    picks.some(p => p.court === court && p.hour === hour)

  function handleCellClick(court: number, h: number) {
    if (isSlotTaken(court, toTime(h))) return
    setPicks(prev => {
      const exists = prev.some(p => p.court === court && p.hour === h)
      if (exists) return prev.filter(p => !(p.court === court && p.hour === h))
      return [...prev, { court, hour: h }]
    })
  }

  function removeRange(court: number, start: number, end: number) {
    setPicks(prev => prev.filter(p => !(p.court === court && p.hour >= start && p.hour <= end)))
  }

  function handleResetAll() {
    setPicks([])
  }

  const ranges = groupRanges(picks)

  // Map UI ranges (hour-int bounds, end-inclusive) → API shape (HH:MM strings, duration in hours).
  function rangesForApi() {
    return ranges.map(r => ({
      court_number: r.court,
      start_time: toTime(r.start),
      duration: r.end - r.start + 1,
    }))
  }

  // Map UI ranges → display shape with end-time (start of the hour after the last picked slot).
  function rangesForDisplay() {
    return ranges.map(r => ({
      court_number: r.court,
      start_time: toTime(r.start),
      end_time: toTime(r.end + 1),
    }))
  }

  // Continue → lock the picked slots up front, then move to the details
  // phase. Customer data is collected during details and written by
  // /api/confirm-booking when the user submits payment.
  async function handleContinue() {
    if (picks.length === 0 || locking) return
    setLocking(true)
    setLockError('')
    try {
      const res = await fetch('/api/lock-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ranges: rangesForApi(),
          booking_date: date,
          players,
          pay_mode: payOnsite ? 'onsite_entrance' : 'online',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setLockError(data.error || 'Could not lock slot. Try again.')
        if (res.status === 409) {
          cacheRef.current.delete(date)
          fetchAvailability(date)
        }
        return
      }
      setLockData({ reference: data.reference, lockedUntil: data.locked_until, courtNumbers: data.court_numbers })
      setPhase('details')
      window.history.pushState({ step: 'details' }, '', window.location.href)
    } catch {
      setLockError('Network error. Please try again.')
    } finally {
      setLocking(false)
    }
  }

  // Confirm & Pay → open the modal. Lock already exists from handleContinue;
  // confirm-booking will fill in customer fields when the user submits payment.
  function handleConfirmPay() {
    if (!formValid || !lockData) return
    setShowModal(true)
    window.history.pushState({ step: 'modal' }, '', window.location.href)
  }

  // In-page "Back to selection": transition directly instead of relying on
  // window.history.back(), which can escape /booking when the prior history
  // entry isn't this page. Lock is cancelled here; replaceState drops the
  // {step:'details'} marker so a stale forward-nav can't re-show details.
  function handleBackToReview() {
    setShowModal(false)
    setPhase('review')
    const live = lockData
    if (live) {
      setLockData(null)
      fetch('/api/cancel-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: live.reference }),
      })
        .catch(() => {})
        .finally(() => {
          cacheRef.current.delete(date)
          fetchAvailability(date, { background: true })
        })
    }
    if (window.history.state?.step) {
      window.history.replaceState(null, '', window.location.href)
    }
  }

  function handleExpire() {
    setShowModal(false); setLockData(null)
    setPicks([])
    cacheRef.current.delete(date)
    fetchAvailability(date)
    setLockError('Your 10-minute hold expired. Please select again.')
  }

  function handleSuccess(reference: string) {
    if (!lockData) return
    setShowModal(false)
    setSuccess({
      reference,
      ranges: rangesForDisplay(),
      bookingDate: date,
      price: onlineDue,
      players,
      customerName,
      customerPhone,
      customerEmail: customerEmail.trim() || undefined,
      payOnsite,
      entranceFee,
    })
    setPicks([])
    setCustomerName(''); setCustomerPhone(''); setCustomerEmail('')
    setPlayerNames(Array(3).fill(''))
    setPlayers(4)
    setPayOnsite(false)
    setLockData(null)
    cacheRef.current.delete(date)
    fetchAvailability(date)
  }

  if (success) {
    return (
      <>
        <Nav />
        <div className={styles.successPage}>
          <div className={styles.successCard}>
            <div className={styles.successIcon}>✓</div>
            <div className={styles.successTitle}>Booking Confirmed!</div>
            <div className={styles.successSub}>
              {success.payOnsite
                ? `See you at the front desk — ₱${success.entranceFee.toLocaleString()} entrance due in cash on arrival.`
                : 'See you on the court. Check your email for the QR gate passes.'}
            </div>
            <div className={styles.bookerSuccessBlock}>
              <div className={styles.bookerSuccessLabel}>Booker</div>
              <div className={styles.bookerSuccessName}>{success.customerName}</div>
              <div className={styles.bookerSuccessContact}>{success.customerPhone}</div>
              {success.customerEmail && <div className={styles.bookerSuccessContact}>{success.customerEmail}</div>}
              <div className={styles.bookerSuccessPlayers}>{success.players} {success.players === 1 ? 'player' : 'players'} total</div>
            </div>
            <div className={styles.successSummary}>
              <div className={styles.sRow}><span>Ref #</span><span className={styles.green}>{success.reference}</span></div>
              <div className={styles.sRow}><span>Date</span><span>{success.bookingDate}</span></div>
              {success.ranges.map((r, i) => (
                <div key={i} className={styles.sRow}>
                  <span>Court {r.court_number}</span>
                  <span>{formatTime(r.start_time)} — {formatTime(r.end_time)}</span>
                </div>
              ))}
              <div className={styles.sRow}>
                <span>{success.payOnsite ? 'Paid online' : 'Amount Paid'}</span>
                <span className={styles.green}>₱{success.price.toLocaleString()}</span>
              </div>
              {success.payOnsite && (
                <div className={styles.sRow}>
                  <span>Cash at desk</span>
                  <span>₱{success.entranceFee.toLocaleString()}</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn-primary" style={{ clipPath: 'none' }} onClick={() => setSuccess(null)}>Book Another</button>
              <Link href="/" className="btn-outline" style={{ clipPath: 'none' }}>Back to Home</Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Nav />
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <Link href="/" className={styles.back}>← Back</Link>
          </div>
          <div className={styles.pageLabel}>— Book a Court</div>
          <div className={styles.pageTitle}>Reserve a Court</div>
          {phase === 'review' && (
            <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.55)', fontSize: 13, maxWidth: 720 }}>
              Tap any vacant cell to add a 1-hour slot. Tap a selected cell to remove it. Adjacent slots on the same court merge into a single range.
            </p>
          )}
        </div>

        {/* DATE — Phase 1 only */}
        {phase === 'review' && (
        <div className={styles.datePicker} data-tour="date">
          <div className={styles.dateHeader}>
            <label className="field-label">Select Date</label>
            {loading && <span className={styles.loadingText}>Checking availability…</span>}
          </div>
          {(() => {
            const todayD = new Date()
            const todayISO = isoOf(todayD)
            const maxD = new Date(todayD.getFullYear(), todayD.getMonth(), todayD.getDate() + MAX_DAYS_AHEAD)
            const maxISO = isoOf(maxD)
            const days = buildMonthDays(viewMonth.y, viewMonth.m)
            const isCurrentViewMonth = viewMonth.y === todayD.getFullYear() && viewMonth.m === todayD.getMonth()
            const lastDayOfView = new Date(viewMonth.y, viewMonth.m + 1, 0)
            const canGoNext = isoOf(new Date(lastDayOfView.getFullYear(), lastDayOfView.getMonth() + 1, 1)) <= maxISO
            return (
              <>
                <div className={styles.monthHeader}>
                  <button type="button" className={styles.monthNav}
                    onClick={() => setViewMonth(v => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 })}
                    disabled={isCurrentViewMonth} aria-label="Previous month">‹</button>
                  <div className={styles.monthLabel}>{MONTHS_FULL[viewMonth.m]} {viewMonth.y}</div>
                  <button type="button" className={styles.monthNav}
                    onClick={() => setViewMonth(v => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 })}
                    disabled={!canGoNext} aria-label="Next month">›</button>
                </div>
                <div className={styles.weekStrip}>
                  {days.map(d => {
                    const past = d.iso < todayISO
                    const future = d.iso > maxISO
                    const disabled = past || future
                    const cls = [
                      styles.dayCard,
                      d.iso === date ? styles.dayCardSelected : '',
                      d.isToday ? styles.dayCardToday : '',
                      disabled ? styles.dayCardDisabled : '',
                    ].filter(Boolean).join(' ')
                    return (
                      <button key={d.iso} type="button" className={cls}
                        onClick={() => !disabled && setDate(d.iso)} disabled={disabled}>
                        <span className={styles.dayDow}>{d.isToday ? 'TODAY' : d.dow.toUpperCase()}</span>
                        <span className={styles.dayNum}>{d.day}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </div>
        )}

        {/* RATE GUIDE — Phase 1 only */}
        {phase === 'review' && <RateGuide date={date} holidays={holidays} picks={picks} />}

        {/* MATRIX — Phase 1 only */}
        {phase === 'review' && (
        <div className={styles.matrixSection}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionLabel}>01 — Pick Court & Time (1 tap = 1 hour)</div>
            <LobbyPlanButton className={styles.lobbyBtn} />
          </div>
          <div className={styles.legend}>
            <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.dotGreen}`} />Available</div>
            <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.dotAmber}`} />On Hold</div>
            <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.dotRed}`} />Fully Booked</div>
          </div>
          <div className={styles.matrixHint} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              {picks.length === 0 && (
                <span>Tap any vacant cell to add a 1-hour slot. Tap a selected cell to remove it.</span>
              )}
              {picks.length > 0 && (
                <span className={styles.hintGreen}>{totalHours}h total · ₱{courtFee.toLocaleString()} court fee</span>
              )}
            </div>
            {picks.length > 0 && (
              <button type="button" className={styles.resetLink} onClick={handleResetAll} aria-label="Reset all selections">
                Reset All
              </button>
            )}
          </div>
          <CourtHourMatrix
            courts={Array.from({ length: TOTAL_COURTS }, (_, i) => i + 1)}
            hours={Array.from({ length: SLOTS_TOTAL }, (_, i) => HOUR_MIN + i)}
            isCellBooked={(c, h) => isSlotTaken(c, toTime(h)) && !isSlotHeld(c, toTime(h))}
            isCellHeld={(c, h) => isSlotHeld(c, toTime(h))}
            isCellSelected={isCellSelected}
            onCellClick={handleCellClick}
            formatHour={formatHour}
            getRowStatus={(h) => getTimeStatus(toTime(h), slots)}
          />
        </div>
        )}

        {/* SELECTIONS LIST — both phases; read-only in details */}
        {ranges.length > 0 && (
          <div className={styles.detailsSection}>
            <div className={styles.sectionLabel}>
              {phase === 'review'
                ? '02 — Your Selections'
                : `02 — Booking for ${new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {ranges.map(r => {
                const hours = r.end - r.start + 1
                let fee = 0
                for (let h = r.start; h <= r.end; h++) fee += priceForHour(date, h, holidays)
                const key = `${r.court}-${r.start}-${r.end}`
                return (
                  <div key={key} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', background: 'var(--dark2)',
                    border: '1px solid rgba(34,197,94,0.4)',
                    fontFamily: 'var(--font-barlow-condensed), sans-serif',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)', letterSpacing: 1 }}>COURT {r.court}</span>
                      <span style={{ fontSize: 14, color: 'var(--text-light)' }}>
                        {formatTime(toTime(r.start))} — {formatTime(toTime(r.end + 1))} · {hours}h · ₱{fee.toLocaleString()}
                      </span>
                    </div>
                    {phase === 'review' && (
                      <button type="button" onClick={() => removeRange(r.court, r.start, r.end)} aria-label={`Remove COURT ${r.court} ${formatHour(r.start)}`}
                        style={{
                          background: 'transparent', border: '1px solid rgba(239,68,68,0.4)',
                          color: 'rgba(239,68,68,0.9)', fontFamily: 'inherit', fontSize: 11,
                          letterSpacing: 1, padding: '6px 12px', cursor: 'pointer',
                        }}>
                        × REMOVE
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* DETAILS — only after Continue */}
        {phase === 'details' && picks.length > 0 && (
          <div className={styles.detailsSection}>
            <button type="button" className={styles.backLink} onClick={handleBackToReview}>
              ← Back to selection
            </button>
            <div className={styles.detailsHeader}>
              <div className={styles.sectionLabel} style={{ marginBottom: 0 }}>03 — Your Details</div>
              {lockData && <HoldBadge lockedUntil={lockData.lockedUntil} onExpire={handleExpire} />}
            </div>

            {!payOnsite && (
              <>
                <div className={styles.playersHeader}>
                  <div>
                    <div className={styles.playersHeaderTitle}>You picked {players} {players === 1 ? 'player' : 'players'}</div>
                    <div className={styles.playersHeaderHint}>Each player gets a QR gate pass · ₱{ENTRANCE_FEE_PER_PERSON}/head</div>
                  </div>
                  <div className={styles.stepper}>
                    <button type="button" className={styles.stepperBtn}
                      onClick={() => setPlayers(p => Math.max(1, p - 1))}
                      disabled={players <= 1} aria-label="Decrease players">–</button>
                    <span className={styles.stepperValue}>{players}</span>
                    <button type="button" className={styles.stepperBtn}
                      onClick={() => setPlayers(p => Math.min(20, p + 1))}
                      disabled={players >= 20} aria-label="Increase players">+</button>
                  </div>
                </div>

                {/* Player 1 — booker (name + phone + email) */}
                <div className={`${styles.playerCard} ${styles.playerCardBooker}`}>
                  <div className={styles.playerCardHead}>
                    <span className={styles.playerCardNum}>1</span>
                    <span className={styles.playerCardLabel}>Main Booker</span>
                    <span className={styles.youBadge}>YOU</span>
                  </div>
                  <div className={styles.playerCardFields}>
                    <div className={styles.field}>
                      <label className="field-label">Full Name *</label>
                      <input className="field-input" value={customerName}
                        onChange={e => setCustomerName(e.target.value)} placeholder="Juan dela Cruz" />
                    </div>
                    <div className={styles.fieldRow}>
                      <div className={styles.field}>
                        <label className="field-label">Phone *</label>
                        <input className="field-input" type="tel" value={customerPhone}
                          onChange={e => setCustomerPhone(e.target.value)} placeholder="+63 9XX XXX XXXX" />
                      </div>
                      <div className={styles.field}>
                        <label className="field-label">Email *</label>
                        <input className="field-input" type="email" value={customerEmail}
                          onChange={e => setCustomerEmail(e.target.value)} placeholder="juan@email.com" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Players 2..N — name only */}
                {playerNames.map((name, i) => (
                  <div key={i} className={styles.playerCard}>
                    <div className={styles.playerCardHead}>
                      <span className={styles.playerCardNum}>{i + 2}</span>
                      <span className={styles.playerCardLabel}>Player {i + 2}</span>
                    </div>
                    <div className={styles.playerCardFields}>
                      <div className={styles.field}>
                        <label className="field-label">Name *</label>
                        <input className="field-input" value={name}
                          onChange={e => setPlayerNames(prev => prev.map((n, j) => j === i ? e.target.value : n))}
                          placeholder={`Player ${i + 2} name`} />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {payOnsite && (
              <>
                <div className={`${styles.playerCard} ${styles.playerCardBooker}`}>
                  <div className={styles.playerCardHead}>
                    <span className={styles.playerCardLabel}>Main Booker</span>
                  </div>
                  <div className={styles.playerCardFields}>
                    <div className={styles.field}>
                      <label className="field-label">Full Name *</label>
                      <input className="field-input" value={customerName}
                        onChange={e => setCustomerName(e.target.value)} placeholder="Juan dela Cruz" />
                    </div>
                    <div className={styles.field}>
                      <label className="field-label">Email *</label>
                      <input className="field-input" type="email" value={customerEmail}
                        onChange={e => setCustomerEmail(e.target.value)} placeholder="juan@email.com" />
                    </div>
                    <div className={styles.field}>
                      <label className="field-label">Phone *</label>
                      <input className="field-input" type="tel" value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)} placeholder="+63 9XX XXX XXXX" />
                    </div>
                  </div>
                </div>

              </>
            )}
          </div>
        )}

        {/* PRICE PANEL */}
        {picks.length > 0 && (
          <div className={styles.confirmPanel} data-tour="confirm">
            <div className={styles.confirmDetails}>
              <div className={styles.confirmItem}>
                <div className={styles.confirmVal}>{numCourts}</div>
                <div className={styles.confirmKey}>{numCourts === 1 ? 'Court' : 'Courts'}</div>
              </div>
              {showAmPmBreakdown ? (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div className={styles.confirmItem}>
                    <div className={styles.confirmVal}>{amHours}h</div>
                    <div className={styles.confirmKey}>Morning</div>
                  </div>
                  <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.35)', fontWeight: 300, paddingTop: 6, alignSelf: 'flex-start' }}>+</span>
                  <div className={styles.confirmItem}>
                    <div className={styles.confirmVal}>{pmHours}h</div>
                    <div className={styles.confirmKey}>Evening</div>
                  </div>
                </div>
              ) : (
                <div className={styles.confirmItem}>
                  <div className={styles.confirmVal}>{totalHours}h</div>
                  <div className={styles.confirmKey}>{amHours > 0 ? 'Morning' : 'Evening'}</div>
                </div>
              )}
            </div>
            <div className={styles.confirmRight}>
              <div className={styles.priceBreakdown}>
                <span>Court ₱{courtFee.toLocaleString()}</span>
                <span>{payOnsite ? `· Entrance ₱${ENTRANCE_FEE_PER_PERSON}/head (paid onsite)` : `+ Entrance ₱${entranceFee.toLocaleString()}`}</span>
              </div>
              {phase === 'review' && (
                <button
                  type="button"
                  className={`${styles.payModeToggle} ${payOnsite ? styles.payModeToggleActive : ''}`}
                  onClick={() => setPayOnsite(v => !v)}
                  aria-pressed={payOnsite}
                  aria-label="Toggle pay entrance onsite"
                >
                  <span className={styles.payModeSwitch} />
                  Pay entrance at front desk
                </button>
              )}
              <div className={styles.confirmPrice}>₱{onlineDue.toLocaleString()} <span>{payOnsite ? 'due online' : 'preview'}</span></div>
              {phase === 'review' ? (
                <>
                  {lockError && <div className={styles.lockError}>{lockError}</div>}
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleContinue}
                    disabled={locking}
                    style={{ fontSize: 14, padding: '14px 28px' }}
                  >
                    {locking ? 'Locking slot…' : 'Continue → 10 min hold'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleConfirmPay}
                  disabled={!formValid}
                  style={{ fontSize: 14, padding: '14px 28px' }}
                >
                  {!formValid ? 'Fill in your details' : 'Confirm & Pay'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showModal && lockData && (
        <BookingModal
          details={{
            reference: lockData.reference,
            lockedUntil: lockData.lockedUntil,
            courtNumbers: lockData.courtNumbers,
            bookingDate: date,
            startTime: '',
            endTime: '',
            duration: totalHours,
            players,
            price: onlineDue,
            courtFee,
            entranceFee,
            customerName,
            customerPhone,
            customerEmail: customerEmail.trim() || undefined,
            playerNames: payOnsite ? [] : playerNames.map(n => n.trim()),
            ranges: rangesForDisplay(),
            payOnsite,
          }}
          onSuccess={handleSuccess}
          onExpire={handleExpire}
          onClose={() => window.history.back()}
        />
      )}
    </>
  )
}
