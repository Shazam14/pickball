'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import { LobbyPlanButton } from '@/components/LobbyPlan'
import CourtHourMatrix, { type Slot } from './CourtHourMatrix'
import { TOTAL_COURTS, ENTRANCE_FEE_PER_PERSON, priceForHour, COURT_PRICE_PER_HOUR, COURT_PRICE_OFFPEAK } from '@/lib/types'
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

function RateGuide({ date, holidays }: { date: string; holidays: Set<string> }) {
  const d = new Date(date + 'T00:00:00')
  const dow = d.getDay()
  const isWeekend = dow === 0 || dow === 6
  const isHoliday = holidays.has(date)
  const isFlatDay = isWeekend || isHoliday

  const ctxLabel = isHoliday ? `${DOW[dow].toUpperCase()} · HOLIDAY`
    : isWeekend ? `${DOW[dow].toUpperCase()} · WEEKEND`
    : `${DOW[dow].toUpperCase()} · WEEKDAY`

  const tiers = [
    { key: 'offpeak', label: 'Off-Peak', meta: 'Mon–Fri · 8AM–4PM',  price: COURT_PRICE_OFFPEAK,    active: !isFlatDay },
    { key: 'peak',    label: 'Peak',     meta: 'Mon–Fri · 4PM–12AM', price: COURT_PRICE_PER_HOUR,   active: !isFlatDay },
    { key: 'weekend', label: 'Weekend',  meta: 'Sat–Sun · all day',  price: COURT_PRICE_PER_HOUR,   active: isWeekend && !isHoliday },
    { key: 'holiday', label: 'Holiday',  meta: 'PH/Cebu · all day',  price: COURT_PRICE_PER_HOUR,   active: isHoliday },
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

export default function ConceptDBookingPage() {
  const [date, setDate] = useState(today())
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const [slots, setSlots] = useState<SlotMatrix>({})
  const [loading, setLoading] = useState(false)
  const [picks, setPicks] = useState<Slot[]>([])
  const [players, setPlayers] = useState(4)
  const [holidays, setHolidays] = useState<Set<string>>(new Set())

  const totalHours = picks.length
  const courtFee = picks.reduce((sum, p) => sum + priceForHour(date, p.hour, holidays), 0)
  const entranceFee = players * ENTRANCE_FEE_PER_PERSON
  const price = courtFee + entranceFee

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

  const isSlotTaken = (court: number, time: string) =>
    !(slots[time]?.find(s => s.court === court)?.available ?? true)

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
          <div className={styles.pageTitle}>Independent Multi-Slot</div>
          <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.55)', fontSize: 13, maxWidth: 720 }}>
            Tap any green cell to add a 1-hour slot. Tap again to remove it. Adjacent slots on the same court merge into a single range. <strong>Preview only — no booking lands.</strong>
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

        {/* RATE GUIDE */}
        <RateGuide date={date} holidays={holidays} />

        {/* MATRIX */}
        <div className={styles.matrixSection}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionLabel}>01 — Pick Court & Time (1 tap = 1 hour)</div>
            <LobbyPlanButton className={styles.lobbyBtn} />
          </div>
          <div className={styles.matrixHint} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              {picks.length === 0 && (
                <span>Tap any green cell to add a 1-hour slot. Tap a selected cell to remove it.</span>
              )}
              {picks.length > 0 && (
                <>
                  <span className={styles.hintGreen}>{picks.length} {picks.length === 1 ? 'slot' : 'slots'} · {ranges.length} {ranges.length === 1 ? 'range' : 'ranges'}</span>
                  {' · '}{totalHours}h total · ₱{courtFee.toLocaleString()} court fee
                </>
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
            isCellBooked={(c, h) => isSlotTaken(c, toTime(h))}
            isCellSelected={isCellSelected}
            onCellClick={handleCellClick}
            formatHour={formatHour}
            getRowStatus={(h) => getTimeStatus(toTime(h), slots)}
          />
        </div>

        {/* SELECTIONS LIST */}
        {ranges.length > 0 && (
          <div className={styles.detailsSection}>
            <div className={styles.sectionLabel}>02 — Your Selections</div>
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
                      <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)', letterSpacing: 1 }}>SO{r.court}</span>
                      <span style={{ fontSize: 14, color: 'var(--text-light)' }}>
                        {formatTime(toTime(r.start))} — {formatTime(toTime(r.end + 1))} · {hours}h · ₱{fee.toLocaleString()}
                      </span>
                    </div>
                    <button type="button" onClick={() => removeRange(r.court, r.start, r.end)} aria-label={`Remove SO${r.court} ${formatHour(r.start)}`}
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
        {picks.length > 0 && (
          <div className={styles.confirmPanel} data-tour="confirm">
            <div className={styles.confirmDetails}>
              <div className={styles.confirmItem}>
                <div className={styles.confirmVal}>{ranges.length}</div>
                <div className={styles.confirmKey}>{ranges.length === 1 ? 'Range' : 'Ranges'}</div>
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
