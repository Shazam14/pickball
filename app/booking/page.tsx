'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import BookingModal from '@/components/BookingModal'
import { TOTAL_COURTS, COURT_PRICE_PER_HOUR, ENTRANCE_FEE_PER_PERSON } from '@/lib/types'
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

function formatTimeShort(t: string) {
  const hr = parseInt(t.split(':')[0])
  if (hr < 12) return `${hr}AM`
  if (hr === 12) return '12PM'
  return `${hr - 12}PM`
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const WEEK_STRIP_DAYS = 14

function dateRangeFromToday(days: number) {
  const out: { iso: string; dow: string; day: number; mon: string; isToday: boolean }[] = []
  const now = new Date()
  for (let i = 0; i < days; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    out.push({
      iso: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
      dow: DOW[d.getDay()],
      day: d.getDate(),
      mon: MON[d.getMonth()],
      isToday: i === 0,
    })
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

function pctFor(h: number) { return ((h - HOUR_MIN) / SLOTS_TOTAL) * 100 }

interface LockResponse { reference: string; lockedUntil: string; courtNumbers: number[] }
interface SuccessData {
  reference: string; courtNumbers: number[]; bookingDate: string
  startTime: string; endTime: string; duration: number; price: number
}

export default function BookingPage() {
  const [date, setDate] = useState(today())
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

  // ---- TIME RANGE SLIDER ----
  const trackRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<'start' | 'end' | null>(null)

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

  const stateRef = useRef({ startH, endH, isRangeClear, bookedHours })
  stateRef.current = { startH, endH, isRangeClear, bookedHours }

  const hourFromClientX = (clientX: number) => {
    const el = trackRef.current
    if (!el) return HOUR_MIN
    const rect = el.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return HOUR_MIN + Math.round(ratio * SLOTS_TOTAL)
  }

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!draggingRef.current) return
      e.preventDefault()
      const { startH, endH, isRangeClear } = stateRef.current
      const h = hourFromClientX(e.clientX)
      if (draggingRef.current === 'start') {
        const limit = (endH ?? HOUR_MAX) - 1
        const newStart = Math.max(HOUR_MIN, Math.min(h, limit))
        if (endH != null && !isRangeClear(newStart, endH)) return
        setSelectedStart(toTime(newStart))
        if (endH == null) setSelectedEnd(toTime(newStart + 1))
      } else {
        const lower = (startH ?? HOUR_MIN) + 1
        const newEnd = Math.max(lower, Math.min(h, HOUR_MAX))
        if (startH != null && !isRangeClear(startH, newEnd)) return
        setSelectedEnd(toTime(newEnd))
      }
    }
    function onUp() { draggingRef.current = null }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  function startDrag(thumb: 'start' | 'end') {
    return (e: React.PointerEvent) => {
      e.preventDefault()
      draggingRef.current = thumb
      setLockError('')
    }
  }

  function handleTrackClick(e: React.MouseEvent<HTMLDivElement>) {
    if (draggingRef.current) return
    const h = hourFromClientX(e.clientX)
    if (bookedHours.includes(h)) return
    setLockError('')
    setSelectedStart(toTime(h))
    setSelectedEnd(toTime(h + 1))
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
    setSuccess({ reference, courtNumbers: [...selectedCourts], bookingDate: date, startTime: selectedStart!, endTime: endTime!, duration, price })
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
          <Link href="/" className={styles.back}>← Back</Link>
          <div className={styles.pageLabel}>— Reserve Your Slot</div>
          <div className={styles.pageTitle}>Book a Court</div>
        </div>

        {/* DATE */}
        <div className={styles.datePicker}>
          <div className={styles.dateHeader}>
            <label className="field-label">Select Date</label>
            {loading && <span className={styles.loadingText}>Checking availability…</span>}
          </div>
          <div className={styles.weekStrip}>
            {dateRangeFromToday(WEEK_STRIP_DAYS).map(d => {
              const selected = d.iso === date
              return (
                <button
                  key={d.iso}
                  type="button"
                  className={`${styles.dayCard} ${selected ? styles.dayCardSelected : ''}`}
                  onClick={() => setDate(d.iso)}
                >
                  <span className={styles.dayDow}>{d.isToday ? 'Today' : d.dow}</span>
                  <span className={styles.dayNum}>{d.day}</span>
                  <span className={styles.dayMon}>{d.mon}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* LEGEND */}
        <div className={styles.legend}>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.dotGreen}`} />Available</div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.dotYellow}`} />Limited</div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.dotRed}`} />Fully Booked</div>
        </div>

        {/* STEP 1 */}
        <div className={styles.courtSection}>
          <div className={styles.sectionLabel}>01 — Select Court(s)</div>
          <div className={styles.courtHint}>Tap multiple courts to book them together (tournaments).</div>
          <div className={styles.courtGrid}>
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
              ? 'Tap a start time'
              : !selectedEnd
                ? <><span className={styles.hintGreen}>{formatTime(selectedStart)}</span> selected — tap an end time to extend, or tap again to deselect</>
                : <><span className={styles.hintGreen}>{formatTime(selectedStart)} — {formatTime(selectedEnd)}</span> · {duration}h · ₱{price.toLocaleString()} · tap any slot to change</>
            }
          </div>

          <div className={styles.slider}>
            <div
              ref={trackRef}
              className={styles.sliderTrack}
              onClick={handleTrackClick}
            >
              {bookedHours.map(h => (
                <div
                  key={h}
                  className={styles.sliderBooked}
                  style={{ left: `${pctFor(h)}%`, width: `${100 / SLOTS_TOTAL}%` }}
                  title={`${formatTime(toTime(h))} — booked`}
                />
              ))}
              {startH != null && endH != null && (
                <div
                  className={styles.sliderRange}
                  style={{ left: `${pctFor(startH)}%`, width: `${pctFor(endH) - pctFor(startH)}%` }}
                />
              )}
              {startH != null && (
                <button
                  type="button"
                  className={styles.sliderThumb}
                  style={{ left: `${pctFor(startH)}%` }}
                  onPointerDown={startDrag('start')}
                  aria-label={`Start time ${formatTimeShort(toTime(startH))}`}
                />
              )}
              {endH != null && (
                <button
                  type="button"
                  className={styles.sliderThumb}
                  style={{ left: `${pctFor(endH)}%` }}
                  onPointerDown={startDrag('end')}
                  aria-label={`End time ${formatTimeShort(toTime(endH))}`}
                />
              )}
            </div>
            <div className={styles.sliderTicks}>
              {[6, 12, 18, 22].map(h => (
                <span
                  key={h}
                  className={styles.sliderTick}
                  style={{ left: `${pctFor(h)}%` }}
                >
                  {formatTimeShort(toTime(h))}
                </span>
              ))}
            </div>
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
              <div className={styles.field}>
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
          <div className={styles.confirmPanel}>
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
          details={{ reference: lockData.reference, lockedUntil: lockData.lockedUntil, courtNumbers: lockData.courtNumbers, bookingDate: date, startTime: selectedStart, endTime: endTime, duration, players, price, courtFee, entranceFee }}
          onSuccess={handleSuccess}
          onExpire={handleExpire}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
