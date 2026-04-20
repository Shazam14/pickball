'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import BookingModal from '@/components/BookingModal'
import { TIME_SLOTS, TOTAL_COURTS, COURT_PRICE_PER_HOUR } from '@/lib/types'
import styles from './booking.module.css'

type SlotMatrix = Record<string, { court: number; available: boolean }[]>

function formatTime(t: string) {
  const [h] = t.split(':')
  const hr = parseInt(h)
  return hr >= 12 ? `${hr === 12 ? 12 : hr - 12}:00 ${hr >= 12 ? 'PM' : 'AM'}` : `${hr}:00 AM`
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

interface LockResponse {
  bookingId: string
  reference: string
  lockedUntil: string
}

interface SuccessData {
  reference: string
  courtNumber: number
  bookingDate: string
  startTime: string
  endTime: string
  duration: number
  players: number
  price: number
}

export default function BookingPage() {
  const [date, setDate] = useState(today())
  const [duration, setDuration] = useState(2)
  const [players, setPlayers] = useState(4)
  const [slots, setSlots] = useState<SlotMatrix>({})
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)

  const [selectedCourt, setSelectedCourt] = useState<number | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const [locking, setLocking] = useState(false)
  const [lockError, setLockError] = useState('')

  const [lockData, setLockData] = useState<LockResponse | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [showModal, setShowModal] = useState(false)

  const [success, setSuccess] = useState<SuccessData | null>(null)

  const fetchAvailability = useCallback(async () => {
    setLoading(true)
    setChecked(false)
    setSelectedCourt(null)
    setSelectedTime(null)
    try {
      const res = await fetch(`/api/availability?date=${date}&duration=${duration}`)
      const data = await res.json()
      setSlots(data.slots || {})
      setChecked(true)
    } finally {
      setLoading(false)
    }
  }, [date, duration])

  // Auto-fetch on mount
  useEffect(() => { fetchAvailability() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isCourtAvailableAtTime = (court: number, time: string) => {
    return slots[time]?.find(s => s.court === court)?.available ?? true
  }

  const handleCourtSelect = (court: number) => {
    if (selectedTime && !isCourtAvailableAtTime(court, selectedTime)) return
    setSelectedCourt(court === selectedCourt ? null : court)
    setLockError('')
  }

  const handleTimeSelect = (time: string) => {
    if (selectedCourt && !isCourtAvailableAtTime(selectedCourt, time)) return
    setSelectedTime(time === selectedTime ? null : time)
    setLockError('')
  }

  const isSlotTaken = (court: number, time: string) => {
    return !(slots[time]?.find(s => s.court === court)?.available ?? true)
  }

  const price = duration * COURT_PRICE_PER_HOUR

  async function handleLockAndPay() {
    if (!selectedCourt || !selectedTime) return
    setLocking(true)
    setLockError('')
    try {
      const res = await fetch('/api/lock-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          court_number: selectedCourt,
          booking_date: date,
          start_time: selectedTime,
          duration,
          players,
          customer_name: customerName || 'Guest',
          customer_phone: customerPhone || '0000000000',
          customer_email: customerEmail || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setLockError(data.error || 'Could not lock slot. Please try again.')
        return
      }
      setLockData({ bookingId: data.booking_id, reference: data.reference, lockedUntil: data.locked_until })
      setShowModal(true)
    } finally {
      setLocking(false)
    }
  }

  function handleExpire() {
    setShowModal(false)
    setLockData(null)
    setSelectedCourt(null)
    setSelectedTime(null)
    fetchAvailability()
    setLockError('Your 5-minute hold expired. Please select a slot again.')
  }

  function handleSuccess(reference: string) {
    setShowModal(false)
    const startHour = parseInt(selectedTime!.split(':')[0])
    setSuccess({
      reference,
      courtNumber: selectedCourt!,
      bookingDate: date,
      startTime: selectedTime!,
      endTime: `${String(startHour + duration).padStart(2, '0')}:00`,
      duration,
      players,
      price,
    })
    setSelectedCourt(null)
    setSelectedTime(null)
    fetchAvailability()
  }

  // Available courts for the selected time
  const availableCourtsForTime = selectedTime
    ? (slots[selectedTime] || []).filter(s => s.available).map(s => s.court)
    : Array.from({ length: TOTAL_COURTS }, (_, i) => i + 1)

  // Available times for the selected court
  const availableTimesForCourt = selectedCourt
    ? TIME_SLOTS.filter(t => {
        const startHour = parseInt(t.split(':')[0])
        if (startHour + duration > 22) return false
        return isCourtAvailableAtTime(selectedCourt, t)
      })
    : TIME_SLOTS.filter(t => parseInt(t.split(':')[0]) + duration <= 22)

  if (success) {
    return (
      <>
        <Nav />
        <div className={styles.successPage}>
          <div className={styles.successCard}>
            <div className={styles.successIcon}>✓</div>
            <div className={styles.successTitle}>Booking Confirmed!</div>
            <div className={styles.successSub}>See you on the court. Check your phone/email for confirmation.</div>
            <div className={styles.successSummary}>
              <div className={styles.sRow}><span>Ref #</span><span className={styles.green}>{success.reference}</span></div>
              <div className={styles.sRow}><span>Court</span><span>Court {success.courtNumber}</span></div>
              <div className={styles.sRow}><span>Date</span><span>{success.bookingDate}</span></div>
              <div className={styles.sRow}><span>Time</span><span>{formatTime(success.startTime)} – {formatTime(success.endTime)}</span></div>
              <div className={styles.sRow}><span>Players</span><span>{success.players}</span></div>
              <div className={styles.sRow}><span>Amount Paid</span><span className={styles.green}>₱{success.price.toLocaleString()}</span></div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn-primary" style={{ clipPath: 'none' }} onClick={() => setSuccess(null)}>
                Book Another
              </button>
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

        {/* FILTERS */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label className="field-label">Date</label>
            <input
              type="date"
              className="field-input"
              value={date}
              min={today()}
              onChange={e => { setDate(e.target.value); setChecked(false); setSelectedCourt(null); setSelectedTime(null) }}
            />
          </div>
          <div className={styles.filterGroup}>
            <label className="field-label">Duration</label>
            <select className="field-input" value={duration} onChange={e => { setDuration(+e.target.value); setChecked(false); setSelectedCourt(null); setSelectedTime(null) }}>
              <option value={1}>1 Hour — ₱500</option>
              <option value={2}>2 Hours — ₱1,000</option>
              <option value={3}>3 Hours — ₱1,500</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className="field-label">Players</label>
            <select className="field-input" value={players} onChange={e => setPlayers(+e.target.value)}>
              <option value={2}>2 Players</option>
              <option value={4}>4 Players</option>
            </select>
          </div>
          <button className="btn-primary" onClick={fetchAvailability} disabled={loading} style={{ alignSelf: 'flex-end', whiteSpace: 'nowrap' }}>
            {loading ? 'Checking...' : 'Check Availability'}
          </button>
        </div>

        {checked && (
          <>
            {/* COURT GRID */}
            <div className={styles.courtSection}>
              <div className={styles.sectionLabel}>— Select Your Court</div>
              <div className={styles.courtGrid}>
                {Array.from({ length: TOTAL_COURTS }, (_, i) => i + 1).map(c => {
                  const available = availableCourtsForTime.includes(c)
                  const selected = selectedCourt === c
                  return (
                    <div
                      key={c}
                      className={`${styles.courtCard} ${!available ? styles.courtTaken : ''} ${selected ? styles.courtSelected : ''}`}
                      onClick={() => available && handleCourtSelect(c)}
                    >
                      <div className={styles.courtNum}>{c}</div>
                      <div className={styles.courtLabel}>Court</div>
                      <div className={styles.courtStatus}>
                        {selected ? 'Selected' : available ? 'Available' : 'Taken'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* TIME SLOTS */}
            <div className={styles.timeSection}>
              <div className={styles.sectionLabel}>— Pick Your Time</div>
              <div className={styles.timeGrid}>
                {TIME_SLOTS.filter(t => parseInt(t.split(':')[0]) + duration <= 22).map(t => {
                  const taken = selectedCourt ? isSlotTaken(selectedCourt, t) : false
                  const available = availableTimesForCourt.includes(t)
                  const selected = selectedTime === t
                  return (
                    <div
                      key={t}
                      className={`${styles.timeSlot} ${taken || !available ? styles.timeTaken : ''} ${selected ? styles.timeSelected : ''}`}
                      onClick={() => !taken && available && handleTimeSelect(t)}
                    >
                      {formatTime(t)}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* CONFIRM PANEL */}
        {selectedCourt && selectedTime && (
          <div className={styles.confirmPanel}>
            <div className={styles.confirmDetails}>
              <div className={styles.confirmItem}>
                <div className={styles.confirmVal}>Court {selectedCourt}</div>
                <div className={styles.confirmKey}>Court</div>
              </div>
              <div className={styles.confirmItem}>
                <div className={styles.confirmVal}>{date}</div>
                <div className={styles.confirmKey}>Date</div>
              </div>
              <div className={styles.confirmItem}>
                <div className={styles.confirmVal}>{formatTime(selectedTime)}</div>
                <div className={styles.confirmKey}>Start Time</div>
              </div>
              <div className={styles.confirmItem}>
                <div className={styles.confirmVal}>{duration}h · {players} players</div>
                <div className={styles.confirmKey}>Duration</div>
              </div>
            </div>
            <div className={styles.confirmRight}>
              <div className={styles.confirmPrice}>₱{price.toLocaleString()} <span>total</span></div>
              {lockError && <div className={styles.lockError}>{lockError}</div>}
              <button
                className="btn-primary"
                onClick={handleLockAndPay}
                disabled={locking}
                style={{ fontSize: 14, padding: '14px 28px' }}
              >
                {locking ? 'Locking slot...' : '🔒 Confirm & Pay (5 min hold)'}
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && lockData && (
        <BookingModal
          details={{
            bookingId: lockData.bookingId,
            reference: lockData.reference,
            lockedUntil: lockData.lockedUntil,
            courtNumber: selectedCourt!,
            bookingDate: date,
            startTime: selectedTime!,
            endTime: `${String(parseInt(selectedTime!.split(':')[0]) + duration).padStart(2, '0')}:00`,
            duration,
            players,
            price,
          }}
          onSuccess={handleSuccess}
          onExpire={handleExpire}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
