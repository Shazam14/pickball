'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import BookingModal from '@/components/BookingModal'
import TourButton, { type TourStep } from '@/components/TourButton'
import { LobbyPlanButton } from '@/components/LobbyPlan'
import { TOTAL_COURTS, COURT_PRICE_PER_HOUR, ENTRANCE_FEE_PER_PERSON } from '@/lib/types'
import { getSupabase } from '@/lib/supabase'
import styles from './booking.module.css'

type Mode = 'reserve' | 'walkin'
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

function hourOf(t: string) { return parseInt(t.split(':')[0]) }
function toTime(h: number) { return `${String(h).padStart(2,'0')}:00` }

const HOUR_MIN = 6
const HOUR_MAX = 22  // exclusive — last possible end-time is 22:00 (10 PM)
const SLOTS_TOTAL = HOUR_MAX - HOUR_MIN  // 16

const TOUR_A_STEPS: TourStep[] = [
  {
    element: '[data-tour="mode"]',
    popover: {
      title: 'Reserve or Walk-In',
      description: 'Pick <b>Reserve</b> to book online and lock your slot, or <b>Walking In</b> to skip the funnel and pay at the venue.',
      side: 'bottom', align: 'center',
    },
  },
  {
    element: '[data-tour="date"]',
    popover: {
      title: 'Pick a date',
      description: 'Scroll the strip to any day this month. Use <b>‹ ›</b> to jump months. Booking is open up to 60 days ahead.',
      side: 'bottom', align: 'center',
    },
  },
  {
    element: '[data-tour="courts"]',
    popover: {
      title: 'Pick one or more courts',
      description: 'Tap a court to add it. Tap multiple to book a tournament block — they all share one reference.',
      side: 'top', align: 'center',
    },
  },
  {
    element: '[data-tour="hours"]',
    popover: {
      title: 'Pick your hour(s)',
      description: 'Tap one box for a 1-hour pick. Tap a second box to extend the range. Striped boxes are already booked.',
      side: 'top', align: 'center',
    },
  },
  {
    element: '[data-tour="players"]',
    popover: {
      title: 'How many players?',
      description: `₱${ENTRANCE_FEE_PER_PERSON} entrance per head — separate from the ₱${COURT_PRICE_PER_HOUR}/hr court fee.`,
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
  const [mode, setMode] = useState<Mode>('reserve')
  const [date, setDate] = useState(today())
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const [slots, setSlots] = useState<SlotMatrix>({})
  const [loading, setLoading] = useState(false)

  const [selectedCourts, setSelectedCourts] = useState<number[]>([])
  const [selectedStart, setSelectedStart] = useState<string | null>(null)
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null)

  const [locking, setLocking] = useState(false)
  const [lockError, setLockError] = useState('')
  const [lockData, setLockData] = useState<LockResponse | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [success, setSuccess] = useState<SuccessData | null>(null)

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [players, setPlayers] = useState(4)

  const duration = selectedStart && selectedEnd
    ? hourOf(selectedEnd) - hourOf(selectedStart)
    : selectedStart ? 1 : 0

  const endTime = selectedEnd ?? (selectedStart ? toTime(hourOf(selectedStart) + 1) : null)
  const courtFee = duration * COURT_PRICE_PER_HOUR * selectedCourts.length
  const entranceFee = players * ENTRANCE_FEE_PER_PERSON
  const price = courtFee + entranceFee

  const formValid =
    selectedCourts.length > 0 &&
    customerName.trim().length > 0 &&
    customerPhone.trim().length > 0 &&
    customerEmail.trim().length > 0 &&
    players >= 1

  const fetchAvailability = useCallback(async (d: string) => {
    setLoading(true)
    setSelectedCourts([])
    setSelectedStart(null)
    setSelectedEnd(null)
    try {
      const res = await fetch(`/api/availability?date=${d}&duration=1`)
      const data = await res.json()
      setSlots(data.slots || {})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAvailability(date) }, [date, fetchAvailability])

  // Realtime: re-fetch when any booking is locked/confirmed for this date
  const channelRef = useRef<ReturnType<typeof getSupabase>['channel'] extends (...args: any[]) => infer R ? R : never | null>(null)
  useEffect(() => {
    const supabase = getSupabase()
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    channelRef.current = supabase
      .channel(`bookings:${date}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `booking_date=eq.${date}` },
        () => { fetchAvailability(date) }
      )
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [date, fetchAvailability])

  const isSlotTaken = (court: number, time: string) =>
    !(slots[time]?.find(s => s.court === court)?.available ?? true)

  // Check all hours in a range are free across ALL selected courts.
  const isRangeClear = useCallback((startH: number, endH: number) => {
    for (let h = startH; h < endH; h++) {
      const t = toTime(h)
      if (selectedCourts.length > 0) {
        if (selectedCourts.some(c => isSlotTaken(c, t))) return false
      } else {
        if (getTimeStatus(t, slots) === 'booked') return false
      }
    }
    return true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourts, slots])

  // ---- TIME (HOUR BOXES) ----
  const startH = selectedStart ? hourOf(selectedStart) : null
  const endH = selectedEnd ? hourOf(selectedEnd) : (startH != null ? startH + 1 : null)

  const bookedHours = (() => {
    const out: number[] = []
    for (let h = HOUR_MIN; h < HOUR_MAX; h++) {
      const t = toTime(h)
      const taken = selectedCourts.length > 0
        ? selectedCourts.some(c => isSlotTaken(c, t))
        : getTimeStatus(t, slots) === 'booked'
      if (taken) out.push(h)
    }
    return out
  })()

  function handleHourClick(h: number) {
    if (bookedHours.includes(h)) return
    setLockError('')

    // No selection yet → start a 1-hour pick.
    if (startH == null || endH == null) {
      setSelectedStart(toTime(h))
      setSelectedEnd(toTime(h + 1))
      return
    }

    // Tap the only selected hour → deselect.
    if (startH === h && endH === h + 1) {
      setSelectedStart(null)
      setSelectedEnd(null)
      return
    }

    // Tap inside an existing multi-hour range → collapse to that single hour.
    if (h >= startH && h < endH) {
      setSelectedStart(toTime(h))
      setSelectedEnd(toTime(h + 1))
      return
    }

    // Tap outside → extend range to cover both. Reject if the bridge crosses a booked hour.
    const newStart = Math.min(startH, h)
    const newEnd = Math.max(endH, h + 1)
    if (!isRangeClear(newStart, newEnd)) {
      setLockError('That range crosses a booked slot. Pick a contiguous open range.')
      return
    }
    setSelectedStart(toTime(newStart))
    setSelectedEnd(toTime(newEnd))
  }

  const handleCourtSelect = (court: number) => {
    setSelectedCourts(prev => prev.includes(court) ? prev.filter(c => c !== court) : [...prev, court].sort((a, b) => a - b))
    setLockError('')
  }

  // A court is available for the current selection if free across the entire
  // chosen range (or just at the start hour if no end yet).
  const availableCourtsForTime = (() => {
    const all = Array.from({ length: TOTAL_COURTS }, (_, i) => i + 1)
    if (!selectedStart) return all
    const startH = hourOf(selectedStart)
    const endH = selectedEnd ? hourOf(selectedEnd) : startH + 1
    return all.filter(c => {
      for (let h = startH; h < endH; h++) {
        if (isSlotTaken(c, toTime(h))) return false
      }
      return true
    })
  })()

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
    setSelectedStart(null); setSelectedEnd(null)
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
    setSelectedCourts([]); setSelectedStart(null); setSelectedEnd(null)
    setCustomerName(''); setCustomerPhone(''); setCustomerEmail(''); setPlayers(4)
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
              <Link href="/concept-b/booking" className={styles.conceptToggle} aria-label="Preview Concept B design">
                <span className={styles.conceptDot} />
                <span className={styles.conceptLabel}>TRY CONCEPT B →</span>
              </Link>
            </div>
          </div>
          <div className={styles.pageLabel}>— Play Pickleball</div>
          <div className={styles.pageTitle}>Book a Court</div>
        </div>

        {/* MODE CHOOSER */}
        <div className={styles.modeChooser} data-tour="mode">
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === 'reserve' ? styles.modeBtnSelected : ''}`}
            onClick={() => setMode('reserve')}
          >
            <div className={styles.modeBtnTitle}>Reserve a Court</div>
            <div className={styles.modeBtnSub}>Pick your court &amp; time. Pay online to lock your slot.</div>
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === 'walkin' ? styles.modeBtnSelected : ''}`}
            onClick={() => setMode('walkin')}
          >
            <div className={styles.modeBtnTitle}>Walking In</div>
            <div className={styles.modeBtnSub}>No reservation needed. Just visit and pay at the venue.</div>
          </button>
        </div>

        {/* WALK-IN CARD */}
        {mode === 'walkin' && (
          <div className={styles.walkinCard}>
            <div className={styles.walkinTitle}>Just Walk In</div>
            <div className={styles.walkinSub}>No online payment. Show up, play, settle at the venue.</div>
            <div className={styles.walkinInfo}>
              <div className={styles.walkinRow}><span>Hours</span><span>Open 24 / 7</span></div>
              <div className={styles.walkinRow}><span>Location</span><span>Mandaue, Cebu</span></div>
              <div className={styles.walkinRow}><span>Court Fee</span><span>₱{COURT_PRICE_PER_HOUR.toLocaleString()} / hr</span></div>
              <div className={styles.walkinRow}><span>Entrance</span><span>₱{ENTRANCE_FEE_PER_PERSON} per player</span></div>
              <div className={styles.walkinRow}><span>Payment</span><span>Pay at the venue</span></div>
            </div>
            <div className={styles.walkinNote}>
              Walk-ins are subject to court availability. To guarantee your slot — especially during peak hours — switch to <strong>Reserve a Court</strong> above.
            </div>
          </div>
        )}

        {mode === 'reserve' && (<>

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

        {/* STEP 1 */}
        <div className={styles.courtSection}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionLabel}>01 — Select Court(s)</div>
            <LobbyPlanButton className={styles.lobbyBtn} />
          </div>
          <div className={styles.courtHint}>Tap multiple courts to book them together (tournaments).</div>
          <div className={styles.courtGrid} data-tour="courts">
            {Array.from({ length: TOTAL_COURTS }, (_, i) => i + 1).map(c => {
              const available = availableCourtsForTime.includes(c)
              const selected = selectedCourts.includes(c)
              return (
                <div key={c} className={`${styles.courtCard} ${!available ? styles.courtTaken : ''} ${selected ? styles.courtSelected : ''}`} onClick={() => available && handleCourtSelect(c)}>
                  {selected && <div className={styles.courtCheck}>✓</div>}
                  <div className={styles.courtNum}>{c}</div>
                  <div className={styles.courtLabel}>Court</div>
                  <div className={styles.courtStatus}>{selected ? 'Selected' : available ? 'Available' : 'Taken'}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* STEP 2 */}
        <div className={styles.timeSection}>
          <div className={styles.sectionLabel}>02 — Select Time</div>
          <div className={styles.timeHint}>
            {!selectedStart
              ? 'Tap an hour. Tap a second hour to extend the range.'
              : !selectedEnd || endH === (startH ?? 0) + 1
                ? <><span className={styles.hintGreen}>{formatTime(selectedStart)} — {formatTime(endTime!)}</span> · 1h · tap another hour to extend, tap again to deselect</>
                : <><span className={styles.hintGreen}>{formatTime(selectedStart)} — {formatTime(selectedEnd!)}</span> · {duration}h · ₱{price.toLocaleString()} · tap any hour to change</>
            }
          </div>

          <div className={styles.hourGrid} data-tour="hours">
            {Array.from({ length: SLOTS_TOTAL }, (_, i) => HOUR_MIN + i).map(h => {
              const t = toTime(h)
              const taken = bookedHours.includes(h)
              const status = getTimeStatus(t, slots)
              const inRange = startH != null && endH != null && h >= startH && h < endH
              return (
                <button
                  key={h}
                  type="button"
                  className={`${styles.hourBox} ${inRange ? styles.hourBoxSelected : ''} ${taken ? styles.hourBoxBooked : status === 'limited' ? styles.hourBoxLimited : ''}`}
                  disabled={taken}
                  onClick={() => handleHourClick(h)}
                  aria-pressed={inRange}
                >
                  <span className={styles.hourBoxLabel}>{formatHour(h)}–{formatHour(h + 1)}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* STEP 3 — DETAILS */}
        {selectedCourts.length > 0 && selectedStart && (
          <div className={styles.detailsSection}>
            <div className={styles.sectionLabel}>03 — Your Details</div>
            <p className={styles.detailsNote}>
              We&apos;ll email you a link to add your other players&apos; names — each player gets a QR gate pass for entry.
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
                  >–</button>
                  <span className={styles.stepperValue}>{players}</span>
                  <button
                    type="button"
                    className={styles.stepperBtn}
                    onClick={() => setPlayers(p => Math.min(20, p + 1))}
                    disabled={players >= 20}
                  >+</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRM */}
        {selectedCourts.length > 0 && selectedStart && (
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

        </>)}
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
