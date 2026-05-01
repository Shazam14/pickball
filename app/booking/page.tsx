'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import BookingModal from '@/components/BookingModal'
import TourButton, { type TourStep } from '@/components/TourButton'
import { LobbyPlanButton } from '@/components/LobbyPlan'
import CourtHourMatrix from './CourtHourMatrix'
import { TOTAL_COURTS, COURT_PRICE_PER_HOUR, COURT_PRICE_OFFPEAK, ENTRANCE_FEE_PER_PERSON, courtFeeFor } from '@/lib/types'
import { getSupabase } from '@/lib/supabase'
import styles from './booking.module.css'

type SlotMatrix = Record<string, { court: number; available: boolean }[]>
type TimeStatus = 'available' | 'limited' | 'booked'

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

function today() {
  return isoOf(new Date())
}

const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MAX_DAYS_AHEAD = 60

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

function getTimeStatus(time: string, slots: SlotMatrix): TimeStatus {
  if (!slots[time]) return 'available'
  const count = slots[time].filter(s => s.available).length
  if (count === 0) return 'booked'
  if (count <= 3) return 'limited'
  return 'available'
}

function toTime(h: number) { return `${String(h).padStart(2,'0')}:00` }

const HOUR_MIN = 8
const HOUR_MAX = 24  // exclusive — last possible end-time is 24:00 (midnight)
const SLOTS_TOTAL = HOUR_MAX - HOUR_MIN  // 16

const TOUR_A_STEPS: TourStep[] = [
  {
    element: '[data-tour="date"]',
    popover: {
      title: 'Pick a date',
      description: 'Scroll the strip to any day this month. Use <b>‹ ›</b> to jump months. Booking is open up to 60 days ahead.',
      side: 'bottom', align: 'center',
    },
  },
  {
    element: '[data-tour="matrix"]',
    popover: {
      title: 'Pick your time',
      description: 'Tap one cell to set the start hour. Tap a second cell to set the end. Tap headers (SO1–SO10) afterward to add courts for tournaments.',
      side: 'top', align: 'center',
    },
  },
  {
    element: '[data-tour="players"]',
    popover: {
      title: 'How many players?',
      description: `₱${ENTRANCE_FEE_PER_PERSON} entrance per head — separate from the ₱${COURT_PRICE_OFFPEAK}–${COURT_PRICE_PER_HOUR}/hr court fee.`,
      side: 'left', align: 'center',
    },
  },
  {
    element: '[data-tour="confirm"]',
    popover: {
      title: 'Review & reserve',
      description: 'Once everything is filled in, the <b>Reserve & Pay</b> button opens the payment modal. Slot is held for 1 hour after locking.',
      side: 'top', align: 'center',
    },
  },
]

interface LockResponse { reference: string; lockedUntil: string; courtNumbers: number[] }
interface SuccessData {
  reference: string; courtNumbers: number[]; bookingDate: string
  startTime: string; endTime: string; duration: number; price: number
  players: number; customerName: string; customerPhone: string; customerEmail?: string
}

export default function BookingPage() {
  const [date, setDate] = useState(today())
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const [slots, setSlots] = useState<SlotMatrix>({})
  const [loading, setLoading] = useState(false)

  const [selectedCourts, setSelectedCourts] = useState<number[]>([])
  const [anchorH, setAnchorH] = useState<number | null>(null)
  const [endH, setEndH] = useState<number | null>(null)

  const [locking, setLocking] = useState(false)
  const [lockError, setLockError] = useState('')
  const [lockData, setLockData] = useState<LockResponse | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [success, setSuccess] = useState<SuccessData | null>(null)

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [players, setPlayers] = useState(4)
  const [playerNames, setPlayerNames] = useState<string[]>(() => Array(3).fill(''))
  const [holidays, setHolidays] = useState<Set<string>>(new Set())

  const phase: 'time' | 'courts' = endH === null ? 'time' : 'courts'
  const startH: number | null =
    anchorH === null ? null : endH === null ? null : Math.min(anchorH, endH)
  const endHExcl: number | null =
    endH === null ? null : Math.max(anchorH!, endH) + 1
  const duration = endH === null ? 0 : Math.abs(endH - (anchorH ?? 0)) + 1
  const selectedStart = startH === null ? null : toTime(startH)
  const endTime = endHExcl === null ? null : toTime(endHExcl)

  const courtFee = startH === null ? 0 : courtFeeFor(date, startH, duration, selectedCourts.length, holidays)
  const entranceFee = players * ENTRANCE_FEE_PER_PERSON
  const price = courtFee + entranceFee

  // Keep playerNames length in sync with players count (preserves typed values).
  useEffect(() => {
    setPlayerNames(prev => Array.from({ length: Math.max(0, players - 1) }, (_, i) => prev[i] ?? ''))
  }, [players])

  const formValid =
    selectedCourts.length > 0 &&
    customerName.trim().length > 0 &&
    customerPhone.trim().length > 0 &&
    customerEmail.trim().length > 0 &&
    players >= 1

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

  // User date change: clear selection, fetch (cache-first).
  useEffect(() => {
    setSelectedCourts([])
    setAnchorH(null)
    setEndH(null)
    fetchAvailability(date)
  }, [date, fetchAvailability])

  // On mount: fetch holidays for current + next year (covers booking range).
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

  // Realtime: invalidate cache + background refetch (no spinner, keep selection)
  const channelRef = useRef<ReturnType<typeof getSupabase>['channel'] extends (...args: any[]) => infer R ? R : never | null>(null)
  useEffect(() => {
    const supabase = getSupabase()
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    channelRef.current = supabase
      .channel(`bookings:${date}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `booking_date=eq.${date}` },
        () => {
          cacheRef.current.delete(date)
          fetchAvailability(date, { background: true })
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [date, fetchAvailability])

  const isSlotTaken = (court: number, time: string) =>
    !(slots[time]?.find(s => s.court === court)?.available ?? true)

  // Phase 2 only — toggle add/remove a court (anchor court is permanent).
  const handleCourtSelect = (court: number) => {
    if (phase !== 'courts' || anchorH === null || endH === null) return
    setLockError('')

    const anchorCourt = selectedCourts[0]
    if (court === anchorCourt) return  // anchor cannot be removed

    // Removing an extra court — always allowed.
    if (selectedCourts.includes(court)) {
      setSelectedCourts(prev => prev.filter(c => c !== court))
      return
    }

    // Adding a court — must be free across the full hour range.
    const min = Math.min(anchorH, endH)
    const max = Math.max(anchorH, endH)
    for (let h = min; h <= max; h++) {
      if (isSlotTaken(court, toTime(h))) {
        setLockError(`SO${court} is booked at ${formatHour(h)}. Pick another court.`)
        return
      }
    }
    setSelectedCourts(prev => [...prev, court].sort((a, b) => a - b))
  }

  function handleCellClick(court: number, h: number) {
    setLockError('')
    if (isSlotTaken(court, toTime(h))) return

    // Phase 1 — first tap sets anchor and auto-selects that court.
    if (anchorH === null) {
      setAnchorH(h)
      setSelectedCourts([court])
      return
    }

    // Phase 2 — cell taps are inert. Use Reset.
    if (endH !== null) return

    // Phase 1.5 — second tap commits the range on the originally-tapped court.
    const origCourt = selectedCourts[0]
    const min = Math.min(anchorH, h)
    const max = Math.max(anchorH, h)
    for (let hh = min; hh <= max; hh++) {
      if (isSlotTaken(origCourt, toTime(hh))) {
        setLockError(`That range overlaps a booked slot on Court SO${origCourt}. Pick a smaller range or Reset.`)
        return
      }
    }
    setEndH(h)
  }

  function handleReset() {
    setLockError('')
    setAnchorH(null)
    setEndH(null)
    setSelectedCourts([])
  }

  async function handleLockAndPay() {
    if (selectedCourts.length === 0 || !selectedStart || !endTime || !formValid) return
    setLocking(true)
    setLockError('')
    try {
      const res = await fetch('/api/lock-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          court_numbers: selectedCourts,
          booking_date: date,
          start_time: selectedStart,
          duration,
          players,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_email: customerEmail.trim() || undefined,
          player_names: [customerName.trim(), ...playerNames],
        }),
      })
      const data = await res.json()
      if (!res.ok) { setLockError(data.error || 'Could not lock slot. Try again.'); return }
      setLockData({ reference: data.reference, lockedUntil: data.locked_until, courtNumbers: data.court_numbers })
      setShowModal(true)
    } finally {
      setLocking(false)
    }
  }

  function handleExpire() {
    setShowModal(false); setLockData(null)
    setSelectedCourts([]); setAnchorH(null); setEndH(null)
    cacheRef.current.delete(date)
    fetchAvailability(date)
    setLockError('Your 5-minute hold expired. Please select a slot again.')
  }

  function handleSuccess(reference: string) {
    setShowModal(false)
    setSuccess({
      reference,
      courtNumbers: [...selectedCourts],
      bookingDate: date,
      startTime: selectedStart!,
      endTime: endTime!,
      duration,
      price,
      players,
      customerName,
      customerPhone,
      customerEmail: customerEmail.trim() || undefined,
    })
    setSelectedCourts([]); setAnchorH(null); setEndH(null)
    setCustomerName(''); setCustomerPhone(''); setCustomerEmail(''); setPlayers(4)
    setPlayerNames(Array(3).fill(''))
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
            <div className={styles.successSub}>See you on the court. Check your phone for confirmation.</div>
            <div className={styles.bookerSuccessBlock}>
              <div className={styles.bookerSuccessLabel}>Booker</div>
              <div className={styles.bookerSuccessName}>{success.customerName}</div>
              <div className={styles.bookerSuccessContact}>{success.customerPhone}</div>
              {success.customerEmail && <div className={styles.bookerSuccessContact}>{success.customerEmail}</div>}
              <div className={styles.bookerSuccessPlayers}>{success.players} {success.players === 1 ? 'player' : 'players'} total</div>
            </div>
            <div className={styles.successSummary}>
              <div className={styles.sRow}><span>Ref #</span><span className={styles.green}>{success.reference}</span></div>
              <div className={styles.sRow}><span>{success.courtNumbers.length > 1 ? 'Courts' : 'Court'}</span><span>{success.courtNumbers.map(n => `Court ${n}`).join(', ')}</span></div>
              <div className={styles.sRow}><span>Date</span><span>{success.bookingDate}</span></div>
              <div className={styles.sRow}><span>Time</span><span>{formatTime(success.startTime)} — {formatTime(success.endTime)}</span></div>
              <div className={styles.sRow}><span>Duration</span><span>{success.duration}h</span></div>
              <div className={styles.sRow}><span>Amount Due</span><span className={styles.green}>₱{success.price.toLocaleString()}</span></div>
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
            <div className={styles.headerRight}>
              <TourButton storageKey="pickball:tour:a:seen" steps={TOUR_A_STEPS} className={styles.tourBtn} />
              <Link href="/concept-c/booking" className={styles.conceptToggle} aria-label="Preview the old grid (Phase H)">
                <span className={styles.conceptDot} />
                <span className={styles.conceptLabel}>OLD GRID →</span>
              </Link>
              <Link href="/concept-d/booking" className={styles.conceptToggle} aria-label="Preview independent multi-range">
                <span className={styles.conceptDot} />
                <span className={styles.conceptLabel}>INDEPENDENT →</span>
              </Link>
              <Link href="/concept-b/booking" className={styles.conceptToggle} aria-label="Preview Concept B design">
                <span className={styles.conceptDot} />
                <span className={styles.conceptLabel}>CONCEPT B →</span>
              </Link>
            </div>
          </div>
          <div className={styles.pageLabel}>— Play Pickleball</div>
          <div className={styles.pageTitle}>Book a Court</div>
        </div>

        {/* DATE */}
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
                  <button
                    type="button"
                    className={styles.monthNav}
                    onClick={() => setViewMonth(v => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 })}
                    disabled={isCurrentViewMonth}
                    aria-label="Previous month"
                  >‹</button>
                  <div className={styles.monthLabel}>{MONTHS_FULL[viewMonth.m]} {viewMonth.y}</div>
                  <button
                    type="button"
                    className={styles.monthNav}
                    onClick={() => setViewMonth(v => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 })}
                    disabled={!canGoNext}
                    aria-label="Next month"
                  >›</button>
                </div>
                <div className={styles.weekStrip}>
                  {days.map(d => {
                    const disabled = d.iso < todayISO || d.iso > maxISO
                    const selected = d.iso === date
                    return (
                      <button
                        key={d.iso}
                        type="button"
                        className={`${styles.dayCard} ${selected ? styles.dayCardSelected : ''} ${disabled ? styles.dayCardDisabled : ''}`}
                        disabled={disabled}
                        onClick={() => setDate(d.iso)}
                      >
                        <span className={styles.dayDow}>{d.isToday ? 'Today' : d.dow}</span>
                        <span className={styles.dayNum}>{d.day}</span>
                        <span className={styles.dayMon}>{MON[viewMonth.m]}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </div>

        {/* LEGEND */}
        <div className={styles.legend}>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.dotGreen}`} />Available</div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.dotYellow}`} />Limited</div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.dotRed}`} />Fully Booked</div>
        </div>

        {/* STEP 1 — COURT × HOUR MATRIX */}
        <div className={styles.matrixSection}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionLabel}>01 — Pick Court & Time</div>
            <LobbyPlanButton className={styles.lobbyBtn} />
          </div>
          <div className={styles.matrixHint}>
            {anchorH === null && (
              <span>01a — Tap a green cell to pick your court &amp; start time.</span>
            )}
            {anchorH !== null && endH === null && (
              <>
                <span className={styles.hintGreen}>01a — Court SO{selectedCourts[0]} · {formatHour(anchorH)} anchor</span>
                {' · '}tap a second cell to set the end time.
              </>
            )}
            {endH !== null && (
              <>
                <span className={styles.hintGreen}>01b — {selectedCourts.length > 1 ? `Courts ${selectedCourts.map(c => `SO${c}`).join(', ')}` : `Court SO${selectedCourts[0]}`} · {formatTime(selectedStart!)} — {formatTime(endTime!)}</span>
                {' · '}{duration}h · ₱{courtFee.toLocaleString()} · tap a header (SO1–SO10) to add courts for tournaments.
              </>
            )}
          </div>
          <CourtHourMatrix
            courts={Array.from({ length: TOTAL_COURTS }, (_, i) => i + 1)}
            hours={Array.from({ length: SLOTS_TOTAL }, (_, i) => HOUR_MIN + i)}
            selectedCourts={selectedCourts}
            anchorH={anchorH}
            startH={startH}
            endH={endHExcl}
            phase={phase}
            isCellBooked={(c, h) => isSlotTaken(c, toTime(h))}
            isCellHeld={() => false}
            onToggleCourt={handleCourtSelect}
            onCellClick={handleCellClick}
            formatHour={formatHour}
            getRowStatus={(h) => getTimeStatus(toTime(h), slots)}
          />
          {anchorH !== null && (
            <button
              type="button"
              className={styles.resetLink}
              onClick={handleReset}
              aria-label="Reset selection"
            >
              Reset
            </button>
          )}
        </div>

        {/* STEP 3 — DETAILS (phase 2 only) */}
        {phase === 'courts' && selectedCourts.length > 0 && selectedStart && (
          <div className={styles.detailsSection}>
            <div className={styles.sectionLabel}>03 — Your Details</div>
            <p className={styles.detailsNote}>
              Each player gets a QR gate pass for check-in. Add names now — they&apos;re optional but help at the gate.
            </p>
            <div className={styles.detailsGrid}>
              <div className={styles.field}>
                <label className="field-label">Full Name *</label>
                <input
                  className="field-input"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Juan dela Cruz"
                />
              </div>
              <div className={styles.field}>
                <label className="field-label">Phone Number *</label>
                <input
                  className="field-input"
                  type="tel"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="+63 9XX XXX XXXX"
                />
              </div>
              <div className={styles.field}>
                <label className="field-label">Email *</label>
                <input
                  className="field-input"
                  type="email"
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  placeholder="juan@email.com"
                />
              </div>
              <div className={styles.field} data-tour="players">
                <label className="field-label">Players (₱{ENTRANCE_FEE_PER_PERSON} entrance / head)</label>
                <div className={styles.stepper}>
                  <button
                    type="button"
                    className={styles.stepperBtn}
                    onClick={() => setPlayers(p => Math.max(1, p - 1))}
                    disabled={players <= 1}
                    aria-label="Decrease players"
                  >–</button>
                  <span className={styles.stepperValue}>{players}</span>
                  <button
                    type="button"
                    className={styles.stepperBtn}
                    onClick={() => setPlayers(p => Math.min(20, p + 1))}
                    disabled={players >= 20}
                    aria-label="Increase players"
                  >+</button>
                </div>
              </div>
            </div>

            {/* Player names — slot 0 mirrors booker, slots 1..N-1 editable */}
            <div className={styles.playerNamesSection}>
              <div className={styles.playerNamesLabel}>Player Names (optional)</div>
              <div className={styles.playerNameRow}>
                <span className={styles.playerIdx}>1</span>
                <input className="field-input" value={customerName || '—'} readOnly
                  style={{ opacity: 0.55, cursor: 'not-allowed', flex: 1 }} />
                <span className={styles.youBadge}>YOU</span>
              </div>
              {playerNames.map((name, i) => (
                <div key={i} className={styles.playerNameRow}>
                  <span className={styles.playerIdx}>{i + 2}</span>
                  <input
                    className="field-input"
                    style={{ flex: 1 }}
                    value={name}
                    onChange={e => setPlayerNames(prev => prev.map((n, j) => j === i ? e.target.value : n))}
                    placeholder={`Player ${i + 2} name (optional)`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONFIRM (phase 2 only) */}
        {phase === 'courts' && selectedCourts.length > 0 && selectedStart && (
          <div className={styles.confirmPanel} data-tour="confirm">
            <div className={styles.confirmDetails}>
              <div className={styles.confirmItem}><div className={styles.confirmVal}>{selectedCourts.length === 1 ? `Court ${selectedCourts[0]}` : `Courts ${selectedCourts.join(', ')}`}</div><div className={styles.confirmKey}>{selectedCourts.length === 1 ? 'Court' : `${selectedCourts.length} Courts`}</div></div>
              <div className={styles.confirmItem}><div className={styles.confirmVal}>{formatTime(selectedStart)}</div><div className={styles.confirmKey}>Start</div></div>
              <div className={styles.confirmItem}><div className={styles.confirmVal}>{formatTime(endTime!)}</div><div className={styles.confirmKey}>End</div></div>
              <div className={styles.confirmItem}><div className={styles.confirmVal}>{duration}h</div><div className={styles.confirmKey}>Duration</div></div>
              <div className={styles.confirmItem}><div className={styles.confirmVal}>{players}</div><div className={styles.confirmKey}>Players</div></div>
            </div>
            <div className={styles.confirmRight}>
              <div className={styles.priceBreakdown}>
                <span>Court ₱{courtFee.toLocaleString()}</span>
                <span>+ Entrance ₱{entranceFee.toLocaleString()}</span>
              </div>
              <div className={styles.confirmPrice}>₱{price.toLocaleString()} <span>total</span></div>
              {lockError && <div className={styles.lockError}>{lockError}</div>}
              <button className="btn-primary" onClick={handleLockAndPay} disabled={locking || !formValid} style={{ fontSize: 14, padding: '14px 28px' }}>
                {locking ? 'Locking slot…' : !formValid ? 'Fill in your details' : 'Confirm & Pay — 5 min hold'}
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && lockData && selectedStart && endTime && (
        <BookingModal
          details={{
            reference: lockData.reference,
            lockedUntil: lockData.lockedUntil,
            courtNumbers: lockData.courtNumbers,
            bookingDate: date,
            startTime: selectedStart,
            endTime: endTime,
            duration,
            players,
            price,
            courtFee,
            entranceFee,
            customerName,
            customerPhone,
            customerEmail: customerEmail.trim() || undefined,
          }}
          onSuccess={handleSuccess}
          onExpire={handleExpire}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
