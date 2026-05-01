'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import { LobbyPlanButton } from '@/components/LobbyPlan'
import CourtHourMatrix, { type Selection } from './CourtHourMatrix'
import { TOTAL_COURTS, COURT_PRICE_PER_HOUR, ENTRANCE_FEE_PER_PERSON } from '@/lib/types'
import { getSupabase } from '@/lib/supabase'
import styles from './booking.module.css'

type SlotMatrix = Record<string, { court: number; available: boolean }[]>
type TimeStatus = 'available' | 'limited' | 'booked'

function getTimeStatus(time: string, slots: SlotMatrix): TimeStatus {
  if (!slots[time]) return 'available'
  const count = slots[time].filter(s => s.available).length
  if (count === 0) return 'booked'
  if (count <= 3) return 'limited'
  return 'available'
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
const HOUR_MIN = 6
const HOUR_MAX = 22
const SLOTS_TOTAL = HOUR_MAX - HOUR_MIN
// Beyond this gap, a 2nd tap is treated as "switch anchor" instead of committing a giant range.
const MAX_RANGE_GAP = 4

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

export default function ConceptDBookingPage() {
  const [date, setDate] = useState(today())
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const [slots, setSlots] = useState<SlotMatrix>({})
  const [loading, setLoading] = useState(false)
  const [selections, setSelections] = useState<Selection[]>([])
  const [error, setError] = useState('')
  const [players, setPlayers] = useState(4)

  // Total hours across all selections (only those with endH set count toward fee)
  const totalHours = selections.reduce((acc, s) => {
    if (s.endH === null) return acc
    return acc + Math.abs(s.endH - s.anchorH) + 1
  }, 0)
  const courtFee = totalHours * COURT_PRICE_PER_HOUR
  const entranceFee = players * ENTRANCE_FEE_PER_PERSON
  const price = courtFee + entranceFee

  const fetchAvailability = useCallback(async (d: string) => {
    setLoading(true)
    setSelections([])
    setError('')
    try {
      const res = await fetch(`/api/availability?date=${d}&duration=1`)
      const data = await res.json()
      setSlots(data.slots || {})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAvailability(date) }, [date, fetchAvailability])

  const channelRef = useRef<ReturnType<typeof getSupabase>['channel'] extends (...args: any[]) => infer R ? R : never | null>(null)
  useEffect(() => {
    const supabase = getSupabase()
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    channelRef.current = supabase
      .channel(`bookings:${date}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `booking_date=eq.${date}` },
        () => { fetchAvailability(date) }
      )
      .subscribe()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [date, fetchAvailability])

  const isSlotTaken = (court: number, time: string) =>
    !(slots[time]?.find(s => s.court === court)?.available ?? true)

  function handleCellClick(court: number, h: number) {
    setError('')
    if (isSlotTaken(court, toTime(h))) return

    const existing = selections.find(s => s.court === court)

    // No selection on this court → start new anchor.
    if (!existing) {
      setSelections(prev => [...prev, { court, anchorH: h, endH: null }])
      return
    }

    // Range already committed → replace with a fresh anchor (tap-to-cycle).
    if (existing.endH !== null) {
      setSelections(prev =>
        prev.map(s => s.court === court ? { court, anchorH: h, endH: null } : s)
      )
      return
    }

    // Pending anchor + far tap → treat as "switch anchor" (avoids accidental giant ranges).
    // Same-cell tap (gap === 0) still commits a 1h range.
    if (Math.abs(h - existing.anchorH) > MAX_RANGE_GAP) {
      setSelections(prev =>
        prev.map(s => s.court === court ? { court, anchorH: h, endH: null } : s)
      )
      return
    }

    // Commit range.
    const min = Math.min(existing.anchorH, h)
    const max = Math.max(existing.anchorH, h)
    for (let hh = min; hh <= max; hh++) {
      if (isSlotTaken(court, toTime(hh))) {
        setError(`SO${court} is booked at ${formatHour(hh)}. Pick a smaller range or remove it.`)
        return
      }
    }
    setSelections(prev =>
      prev.map(s => s.court === court ? { ...s, endH: h } : s)
    )
  }

  function removeSelection(court: number) {
    setError('')
    setSelections(prev => prev.filter(s => s.court !== court))
  }

  function handleResetAll() {
    setError('')
    setSelections([])
  }

  const sorted = [...selections].sort((a, b) => a.court - b.court)
  const inFlight = selections.filter(s => s.endH === null).length
  const committed = selections.filter(s => s.endH !== null).length

  return (
    <>
      <Nav />
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <Link href="/" className={styles.back}>← Back</Link>
            <div className={styles.headerRight}>
              <Link href="/booking" className={styles.conceptToggle} aria-label="Back to the new Kiln-style grid">
                <span className={styles.conceptDot} />
                <span className={styles.conceptLabel}>← BACK TO NEW GRID</span>
              </Link>
              <Link href="/concept-c/booking" className={styles.conceptToggle} aria-label="Old Phase H grid">
                <span className={styles.conceptDot} />
                <span className={styles.conceptLabel}>OLD GRID →</span>
              </Link>
              <Link href="/concept-b/booking" className={styles.conceptToggle} aria-label="Concept B design preview">
                <span className={styles.conceptDot} />
                <span className={styles.conceptLabel}>CONCEPT B →</span>
              </Link>
            </div>
          </div>
          <div className={styles.pageLabel}>— Concept D · UI Preview Only</div>
          <div className={styles.pageTitle}>Independent Multi-Range</div>
          <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.55)', fontSize: 13, maxWidth: 720 }}>
            Each court has its own anchor + end. Tap any cell to start an anchor on that court. Tap a second cell on the same court to commit its range. Tap any cell on a different court to start an independent selection there. <strong>Preview only — no booking lands.</strong>
          </p>
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

        {/* MATRIX */}
        <div className={styles.matrixSection}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionLabel}>01 — Pick Court & Time (independent per court)</div>
            <LobbyPlanButton className={styles.lobbyBtn} />
          </div>
          <div className={styles.matrixHint}>
            {selections.length === 0 && (
              <span>Tap any green cell. Each court has its own state — tap once on a court to set its anchor, tap a second cell on the same court to commit its range.</span>
            )}
            {selections.length > 0 && (
              <>
                <span className={styles.hintGreen}>{committed} committed · {inFlight} pending end-tap</span>
                {' · '}{totalHours}h total · ₱{courtFee.toLocaleString()} court fee
              </>
            )}
          </div>
          <CourtHourMatrix
            courts={Array.from({ length: TOTAL_COURTS }, (_, i) => i + 1)}
            hours={Array.from({ length: SLOTS_TOTAL }, (_, i) => HOUR_MIN + i)}
            selections={selections}
            isCellBooked={(c, h) => isSlotTaken(c, toTime(h))}
            onCellClick={handleCellClick}
            formatHour={formatHour}
            getRowStatus={(h) => getTimeStatus(toTime(h), slots)}
          />
          {selections.length > 0 && (
            <button type="button" className={styles.resetLink} onClick={handleResetAll} aria-label="Reset all selections">
              Reset All
            </button>
          )}
          {error && <div className={styles.lockError} style={{ marginTop: 12 }}>{error}</div>}
        </div>

        {/* SELECTIONS LIST */}
        {selections.length > 0 && (
          <div className={styles.detailsSection}>
            <div className={styles.sectionLabel}>02 — Your Selections</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {sorted.map(s => {
                const range = s.endH === null
                  ? null
                  : { min: Math.min(s.anchorH, s.endH), max: Math.max(s.anchorH, s.endH) }
                const hours = range ? range.max - range.min + 1 : 0
                const fee = hours * COURT_PRICE_PER_HOUR
                return (
                  <div key={s.court} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', background: 'var(--dark2)',
                    border: range ? '1px solid rgba(34,197,94,0.4)' : '1px dashed rgba(255,255,255,0.2)',
                    fontFamily: 'var(--font-barlow-condensed), sans-serif',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)', letterSpacing: 1 }}>SO{s.court}</span>
                      {range
                        ? <span style={{ fontSize: 14, color: 'var(--text-light)' }}>
                            {formatTime(toTime(range.min))} — {formatTime(toTime(range.max + 1))} · {hours}h · ₱{fee.toLocaleString()}
                          </span>
                        : <span style={{ fontSize: 13, color: 'rgba(255,196,0,0.85)' }}>
                            anchor at {formatHour(s.anchorH)} — tap a second cell on SO{s.court} to commit
                          </span>
                      }
                    </div>
                    <button type="button" onClick={() => removeSelection(s.court)} aria-label={`Remove SO${s.court}`}
                      style={{
                        background: 'transparent', border: '1px solid rgba(239,68,68,0.4)',
                        color: 'rgba(239,68,68,0.9)', fontFamily: 'inherit', fontSize: 11,
                        letterSpacing: 1, padding: '6px 12px', cursor: 'pointer',
                      }}>
                      × REMOVE
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* PRICE PANEL */}
        {committed > 0 && (
          <div className={styles.confirmPanel} data-tour="confirm">
            <div className={styles.confirmDetails}>
              <div className={styles.confirmItem}>
                <div className={styles.confirmVal}>{committed}</div>
                <div className={styles.confirmKey}>{committed === 1 ? 'Selection' : 'Selections'}</div>
              </div>
              <div className={styles.confirmItem}>
                <div className={styles.confirmVal}>{totalHours}h</div>
                <div className={styles.confirmKey}>Total Hours</div>
              </div>
              <div className={styles.confirmItem}>
                <div className={styles.confirmVal}>{players}</div>
                <div className={styles.confirmKey}>Players</div>
              </div>
              <div className={styles.field} data-tour="players" style={{ minWidth: 140 }}>
                <label className="field-label">Players (₱{ENTRANCE_FEE_PER_PERSON} / head)</label>
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
            </div>
            <div className={styles.confirmRight}>
              <div className={styles.priceBreakdown}>
                <span>Court ₱{courtFee.toLocaleString()}</span>
                <span>+ Entrance ₱{entranceFee.toLocaleString()}</span>
              </div>
              <div className={styles.confirmPrice}>₱{price.toLocaleString()} <span>preview</span></div>
              <button className="btn-primary" disabled style={{ fontSize: 14, padding: '14px 28px', opacity: 0.5, cursor: 'not-allowed' }}>
                PREVIEW — no booking lands
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
