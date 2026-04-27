'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import BookingModal from '@/components/BookingModal'
import { TIME_SLOTS, TOTAL_COURTS, COURT_PRICE_PER_HOUR, ENTRANCE_FEE_PER_PERSON } from '@/lib/types'
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

function getTimeStatus(time: string, slots: SlotMatrix): TimeStatus {
  if (!slots[time]) return 'available'
  const count = slots[time].filter(s => s.available).length
  if (count === 0) return 'booked'
  if (count <= 3) return 'limited'
  return 'available'
}

function hourOf(t: string) { return parseInt(t.split(':')[0]) }
function toTime(h: number) { return `${String(h).padStart(2,'0')}:00` }

interface LockResponse { bookingId: string; reference: string; lockedUntil: string }
interface SuccessData {
  reference: string; courtNumber: number; bookingDate: string
  startTime: string; endTime: string; duration: number; price: number
}

export default function BookingPage() {
  const [date, setDate] = useState(today())
  const [slots, setSlots] = useState<SlotMatrix>({})
  const [loading, setLoading] = useState(false)

  const [selectedCourt, setSelectedCourt] = useState<number | null>(null)
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
  const courtFee = duration * COURT_PRICE_PER_HOUR
  const entranceFee = players * ENTRANCE_FEE_PER_PERSON
  const price = courtFee + entranceFee

  const formValid =
    customerName.trim().length > 0 &&
    customerPhone.trim().length > 0 &&
    customerEmail.trim().length > 0 &&
    players >= 1

  const fetchAvailability = useCallback(async (d: string) => {
    setLoading(true)
    setSelectedCourt(null)
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

  const isSegmentBooked = (t: string) => {
    if (selectedCourt && isSlotTaken(selectedCourt, t)) return true
    return getTimeStatus(t, slots) === 'booked'
  }

  // Check all hours in a range are free
  const isRangeClear = (startH: number, endH: number) => {
    for (let h = startH; h < endH; h++) {
      if (isSegmentBooked(toTime(h))) return false
    }
    return true
  }

  const handleTimeClick = (time: string) => {
    if (isSegmentBooked(time)) return
    setLockError('')

    if (!selectedStart) {
      setSelectedStart(time)
      setSelectedEnd(null)
      return
    }

    const clickedH = hourOf(time)
    const startH = hourOf(selectedStart)

    if (clickedH === startH) {
      // Tap same slot → deselect
      setSelectedStart(null)
      setSelectedEnd(null)
      return
    }

    if (clickedH < startH) {
      // Tapped before start → restart from here
      setSelectedStart(time)
      setSelectedEnd(null)
      return
    }

    // Tapped after start → try to extend range
    if (isRangeClear(startH, clickedH + 1)) {
      setSelectedEnd(toTime(clickedH + 1))
    } else {
      // Range has a booked slot — restart from tapped time
      setSelectedStart(time)
      setSelectedEnd(null)
    }
  }

  const isInRange = (t: string) => {
    if (!selectedStart) return false
    const h = hourOf(t)
    const startH = hourOf(selectedStart)
    const endH = selectedEnd ? hourOf(selectedEnd) : startH + 1
    return h >= startH && h < endH
  }

  const handleCourtSelect = (court: number) => {
    setSelectedCourt(prev => prev === court ? null : court)
    setSelectedStart(null)
    setSelectedEnd(null)
    setLockError('')
  }

  const availableCourtsForTime = selectedStart
    ? (slots[selectedStart] || []).filter(s => s.available).map(s => s.court)
    : Array.from({ length: TOTAL_COURTS }, (_, i) => i + 1)

  async function handleLockAndPay() {
    if (!selectedCourt || !selectedStart || !endTime || !formValid) return
    setLocking(true)
    setLockError('')
    try {
      const res = await fetch('/api/lock-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          court_number: selectedCourt,
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
      setLockData({ bookingId: data.booking_id, reference: data.reference, lockedUntil: data.locked_until })
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
    setSuccess({ reference, courtNumber: selectedCourt!, bookingDate: date, startTime: selectedStart!, endTime: endTime!, duration, price })
    setSelectedCourt(null); setSelectedStart(null); setSelectedEnd(null)
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
              <div className={styles.sRow}><span>Court</span><span>Court {success.courtNumber}</span></div>
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
          <label className="field-label">Select Date</label>
          <div className={styles.dateRow}>
            <input type="date" className="field-input" style={{ maxWidth: 260 }} value={date} min={today()} onChange={e => setDate(e.target.value)} />
            {loading && <span className={styles.loadingText}>Checking availability…</span>}
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
          <div className={styles.sectionLabel}>01 — Select Court</div>
          <div className={styles.courtGrid}>
            {Array.from({ length: TOTAL_COURTS }, (_, i) => i + 1).map(c => {
              const available = availableCourtsForTime.includes(c)
              const selected = selectedCourt === c
              return (
                <div key={c} className={`${styles.courtCard} ${!available ? styles.courtTaken : ''} ${selected ? styles.courtSelected : ''}`} onClick={() => available && handleCourtSelect(c)}>
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

          <div className={styles.timeline}>
            {TIME_SLOTS.map(t => {
              const booked = isSegmentBooked(t)
              const status = booked ? 'booked' : getTimeStatus(t, slots)
              const inRange = isInRange(t)
              const isStart = t === selectedStart
              const isEndSlot = selectedEnd ? hourOf(t) === hourOf(selectedEnd) - 1 : false
              return (
                <button
                  key={t}
                  className={`${styles.timeSegment} ${styles[`seg_${status}`]} ${inRange ? styles.segInRange : ''} ${isStart ? styles.segStart : ''} ${isEndSlot ? styles.segEnd : ''}`}
                  onClick={() => handleTimeClick(t)}
                  disabled={booked}
                  title={formatTime(t)}
                >
                  <span className={styles.segLabel}>{formatTimeShort(t)}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* STEP 3 — DETAILS */}
        {selectedCourt && selectedStart && (
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
        {selectedCourt && selectedStart && (
          <div className={styles.confirmPanel}>
            <div className={styles.confirmDetails}>
              <div className={styles.confirmItem}><div className={styles.confirmVal}>Court {selectedCourt}</div><div className={styles.confirmKey}>Court</div></div>
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
          details={{ bookingId: lockData.bookingId, reference: lockData.reference, lockedUntil: lockData.lockedUntil, courtNumber: selectedCourt!, bookingDate: date, startTime: selectedStart, endTime: endTime, duration, players, price, courtFee, entranceFee }}
          onSuccess={handleSuccess}
          onExpire={handleExpire}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
