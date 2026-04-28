'use client'

// Concept B — Desktop booking flow, ported from SIDEPICK/design_handoff_sideout/booking-flow.jsx.
// Mock data only. Strict visual parity with the handoff: bone bg, Barlow Condensed,
// JetBrains Mono, court green. Inline styles preserved per handoff aesthetic.

import { useState, Fragment, type ReactNode } from 'react'
import { LobbyPlanThumbnail } from '@/components/LobbyPlan'

const t = {
  bg: '#F4F2EC', ink: '#0F1411', ink2: '#1F2924', mute: '#6B746F',
  line: '#D9D5C9', line2: '#1F2924', card: '#FFFFFF',
  green: '#1FD659', greenDeep: '#0E8B36', amber: '#F5C24A', red: '#E94E3D',
}

const COURT_SVG = '/concept-b/court-green.svg'

type Status = 'open' | 'filling' | 'live' | 'booked'
type CourtCell = { n: number; status: Status; next: string; label?: string }

const COURTS: CourtCell[] = [
  { n: 1, status: 'open', next: '19:00' },
  { n: 2, status: 'filling', next: '20:00' },
  { n: 3, status: 'open', next: '19:00', label: 'COVERED' },
  { n: 4, status: 'live', next: 'IN GAME' },
  { n: 5, status: 'booked', next: '21:00' },
  { n: 6, status: 'open', next: '19:00' },
  { n: 7, status: 'open', next: '19:00', label: 'COVERED' },
  { n: 8, status: 'filling', next: '20:30' },
  { n: 9, status: 'booked', next: '22:00' },
  { n: 10, status: 'open', next: '19:00' },
]

const META: Record<Status, { c: string; l: string }> = {
  open: { c: t.green, l: 'OPEN' },
  filling: { c: t.amber, l: 'FILLING' },
  live: { c: t.greenDeep, l: 'IN GAME' },
  booked: { c: t.red, l: 'BOOKED' },
}

function StepDots({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, margin: '14px 0 22px' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: i === step ? 22 : 8, height: 8, borderRadius: 4,
          background: i === step ? t.green : (i < step ? t.greenDeep : t.line),
          transition: 'all .25s ease',
        }} />
      ))}
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 14 }}>
      <span style={{ width: 11, height: 11, background: color, border: `1px solid ${t.ink}`, display: 'inline-block' }} />
      <span style={{ fontSize: 12, color: t.ink2, fontFamily: 'Archivo, sans-serif' }}>{label}</span>
    </span>
  )
}

function CourtMiniGrid({ pick, setPick }: { pick: number; setPick: (n: number) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
      {COURTS.map(ct => {
        const m = META[ct.status]
        const isSel = pick === ct.n
        const disabled = ct.status === 'booked'
        return (
          <button key={ct.n} onClick={() => !disabled && setPick(ct.n)} style={{
            background: isSel ? '#fff' : (disabled ? '#F8F6F0' : '#FCFBF7'),
            border: `1.5px solid ${isSel ? t.ink : t.line}`,
            padding: 10, cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left',
            opacity: disabled ? 0.55 : 1,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 26, color: t.ink, lineHeight: 0.9 }}>
                  C{String(ct.n).padStart(2, '0')}
                </span>
                {ct.label && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, letterSpacing: '0.18em', color: t.mute }}>{ct.label}</span>}
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, background: m.c, display: 'inline-block' }} />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.18em', color: m.c, fontWeight: 700 }}>{m.l}</span>
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <img src={COURT_SVG} alt="" style={{ width: '100%', display: 'block', filter: disabled ? 'saturate(0.4)' : 'none' }} />
              {disabled && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.4)' }} />}
            </div>
          </button>
        )
      })}
    </div>
  )
}

type Picked = { court: number; hour: number }

function SlotMatrix({
  picked, setPickedTime, hover, setHover, holdSlots,
}: {
  picked: Picked
  setPickedTime: (p: Picked) => void
  hover: Picked | null
  setHover: (p: Picked | null) => void
  holdSlots: [number, number][]
}) {
  const courts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  const hours = Array.from({ length: 16 }, (_, i) => i + 6)
  const fmt = (h: number) => {
    const hh = ((h + 11) % 12) + 1
    const ampm = h >= 12 ? 'P' : 'A'
    const hh2 = (((h + 1) + 11) % 12) + 1
    const ampm2 = (h + 1) >= 12 ? 'P' : 'A'
    return `${hh}${ampm}–${hh2}${ampm2}`
  }
  const isBooked = (c: number, h: number) =>
    (c === 5 && h >= 18 && h < 22) ||
    (c === 9 && h >= 20) ||
    (c === 2 && (h === 14 || h === 15)) ||
    (c === 7 && h === 19) ||
    (c === 4 && h >= 12 && h < 14) ||
    (c === 10 && h === 21)
  const isHeld = (c: number, h: number) => holdSlots.some(([cc, hh]) => cc === c && hh === h)

  return (
    <div style={{ background: t.card, border: `1.5px solid ${t.line}`, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
        <thead>
          <tr style={{ background: '#FAF8F2' }}>
            <th style={{ textAlign: 'left', padding: '12px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em', color: t.mute, borderBottom: `1.5px solid ${t.line}`, width: 110 }}>TIME</th>
            {courts.map(c => (
              <th key={c} style={{ padding: '12px 0', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 16, color: t.ink, borderBottom: `1.5px solid ${t.line}`, letterSpacing: '0.04em' }}>C{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map(h => (
            <tr key={h}>
              <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: t.ink2, borderBottom: `1px solid ${t.line}`, fontWeight: 600 }}>{fmt(h)}</td>
              {courts.map(c => {
                const booked = isBooked(c, h)
                const held = isHeld(c, h)
                const isPicked = picked.court === c && picked.hour === h
                const isHover = hover?.court === c && hover?.hour === h
                let bg = '#F0FBE7', content: ReactNode = '', cursor = 'pointer'
                if (booked) { bg = '#FCEDEA'; content = '×'; cursor = 'not-allowed' }
                else if (held) { bg = '#FFF6DC'; content = '◐'; cursor = 'not-allowed' }
                if (isPicked) bg = t.green
                else if (isHover && !booked && !held) bg = '#D6F4BD'
                return (
                  <td key={c}
                    onMouseEnter={() => setHover({ court: c, hour: h })}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => { if (!booked && !held) setPickedTime({ court: c, hour: h }) }}
                    style={{
                      padding: 0, borderBottom: `1px solid ${t.line}`, borderLeft: `1px solid ${t.line}`,
                      background: bg, textAlign: 'center', height: 36, cursor,
                      color: booked ? t.red : (held ? '#B68900' : t.greenDeep),
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700,
                    }}>
                    {isPicked ? <span style={{ color: '#04140A' }}>✓</span> : content}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.18em' }}>
      <span style={{ color: t.mute }}>{k}</span>
      <span style={{ color: t.ink, fontWeight: 700 }}>{v}</span>
    </div>
  )
}

export default function DesktopFlow() {
  const [step, setStep] = useState(1)
  const [pickedCourt, setPickedCourt] = useState(3)
  const [pickedSlot, setPickedSlot] = useState<Picked>({ court: 3, hour: 19 })
  const [hover, setHover] = useState<Picked | null>(null)
  const [date, setDate] = useState(new Date(2026, 4, 30))
  const [holdSlots] = useState<[number, number][]>([[1, 18], [3, 17], [6, 19], [8, 20]])
  const [paymentMethod, setPaymentMethod] = useState('gcash')
  const [receipt, setReceipt] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
  const fmtTime = (h: number) => {
    const hh = ((h + 11) % 12) + 1
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hh2 = (((h + 1) + 11) % 12) + 1
    const ampm2 = (h + 1) >= 12 ? 'PM' : 'AM'
    return `${hh}:00 ${ampm} – ${hh2}:00 ${ampm2}`
  }

  return (
    <section style={{ background: t.bg, padding: '60px 32px 80px', minHeight: '100%' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 28px' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.3em', color: t.greenDeep }}>
            — RESERVE YOUR COURT
          </div>
          <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 64, color: t.ink, margin: '10px 0 8px', lineHeight: 0.95, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
            BOOK A COURT<span style={{ color: t.green }}>.</span>
          </h2>
          <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 15, color: t.mute, lineHeight: 1.55, margin: 0 }}>
            Pick your court, pick your slot, pay and upload your receipt — done.
            Your slot is held for <span style={{ color: t.greenDeep, fontWeight: 700 }}>1 hour</span> after you submit.
          </p>
        </div>

        <StepDots step={step - 1} />

        <div data-tour="step-indicator" style={{ display: 'flex', justifyContent: 'center', gap: 0, marginBottom: 28, flexWrap: 'wrap' }}>
          {[
            { n: 1, l: 'Pick a court' },
            { n: 2, l: 'Pick your slot' },
            { n: 3, l: 'Pay + upload' },
          ].map((s, i, arr) => {
            const active = step === s.n
            const done = step > s.n
            return (
              <Fragment key={s.n}>
                <button onClick={() => setStep(s.n)} style={{
                  background: active ? t.ink : (done ? t.greenDeep : 'transparent'),
                  color: active || done ? '#fff' : t.ink2,
                  border: `1.5px solid ${active || done ? 'transparent' : t.line}`,
                  padding: '10px 20px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.22em',
                  fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase',
                }}>
                  STEP {s.n} — {s.l}
                </button>
                {i < arr.length - 1 && <span style={{ width: 24, height: 1.5, background: t.line, alignSelf: 'center' }} />}
              </Fragment>
            )
          })}
        </div>

        <div style={{ background: t.card, border: `1.5px solid ${t.line}`, padding: 28 }}>
          {step === 1 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
                <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 24, margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em', color: t.ink }}>
                  STEP 1 — PICK A COURT
                </h3>
                <div>
                  <LegendDot color={t.green} label="Open" />
                  <LegendDot color={t.amber} label="Filling" />
                  <LegendDot color={t.greenDeep} label="In game" />
                  <LegendDot color={t.red} label="Booked" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: 24 }}>
                <div data-tour="court-area">
                  <CourtMiniGrid pick={pickedCourt} setPick={setPickedCourt} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignSelf: 'flex-start' }}>
                <div data-tour="lobby"><LobbyPlanThumbnail /></div>
                <div style={{ background: '#FAF8F2', border: `1.5px solid ${t.line}`, padding: '20px 22px' }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.28em', color: t.greenDeep }}>
                    ◆ SELECTED
                  </div>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 48, color: t.ink, lineHeight: 0.95, margin: '8px 0 14px' }}>
                    COURT C{String(pickedCourt).padStart(2, '0')}<span style={{ color: t.green }}>.</span>
                  </div>
                  <img src={COURT_SVG} alt="" style={{ width: '100%', display: 'block', border: `1px solid ${t.line}` }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', color: t.mute }}>
                    <span>OUTDOOR · FLOODLIT</span><span>ACRYLIC PRO</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', color: t.mute }}>
                    <span>UP TO 4 PLAYERS</span>
                    <span style={{ color: t.ink, fontWeight: 700 }}>₱700 / HR</span>
                  </div>
                  <button onClick={() => setStep(2)} style={{
                    width: '100%', marginTop: 20, background: t.ink, color: '#fff', border: 'none',
                    padding: '14px 0', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 18,
                    letterSpacing: '0.06em', cursor: 'pointer', textTransform: 'uppercase',
                  }}>
                    Next — pick your slot →
                  </button>
                </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
                <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 24, margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em', color: t.ink }}>
                  STEP 2 — PICK YOUR SLOT
                </h3>
                <div>
                  <LegendDot color="#F0FBE7" label="Available" />
                  <LegendDot color="#FFF6DC" label="Held" />
                  <LegendDot color="#FCEDEA" label="Booked" />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, background: '#FAF8F2', border: `1.5px solid ${t.line}`, padding: '10px 16px' }}>
                <button onClick={() => setDate(d => { const x = new Date(d); x.setDate(x.getDate() - 1); return x })} style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: t.ink, padding: '4px 10px' }}>‹</button>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 22, letterSpacing: '0.02em', color: t.ink }}>{fmtDate(date)}</span>
                <button onClick={() => setDate(d => { const x = new Date(d); x.setDate(x.getDate() + 1); return x })} style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: t.ink, padding: '4px 10px' }}>›</button>
              </div>

              <div style={{ background: t.green, color: t.ink, padding: '8px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, letterSpacing: '0.18em', fontWeight: 700, marginBottom: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, background: t.ink, borderRadius: '50%' }} />
                TAP YOUR START TIME ↓
              </div>

              <SlotMatrix picked={pickedSlot} setPickedTime={setPickedSlot} hover={hover} setHover={setHover} holdSlots={holdSlots} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, flexWrap: 'wrap', gap: 12 }}>
                <button onClick={() => setStep(1)} style={{ background: 'transparent', color: t.ink, border: `1.5px solid ${t.line2}`, padding: '12px 22px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 16, letterSpacing: '0.06em', cursor: 'pointer', textTransform: 'uppercase' }}>
                  ← Back
                </button>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.22em', color: t.mute }}>
                  SELECTED · C{pickedSlot.court} · {fmtTime(pickedSlot.hour)}
                </div>
                <button onClick={() => setStep(3)} style={{ background: t.ink, color: '#fff', border: 'none', padding: '12px 22px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 16, letterSpacing: '0.06em', cursor: 'pointer', textTransform: 'uppercase' }}>
                  Next — pay →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: 28 }}>
              <div>
                <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 24, margin: '0 0 18px', textTransform: 'uppercase', letterSpacing: '0.02em', color: t.ink }}>
                  STEP 3 — PAY + UPLOAD RECEIPT
                </h3>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em', color: t.mute, marginBottom: 8 }}>YOUR INFO</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
                      style={{ padding: '12px 14px', border: `1.5px solid ${t.line}`, fontSize: 14, fontFamily: 'Archivo, sans-serif', background: '#FAF8F2', outline: 'none' }} />
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Mobile (09…)"
                      style={{ padding: '12px 14px', border: `1.5px solid ${t.line}`, fontSize: 14, fontFamily: 'Archivo, sans-serif', background: '#FAF8F2', outline: 'none' }} />
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em', color: t.mute, marginBottom: 8 }}>PAYMENT METHOD</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[
                      { k: 'gcash', l: 'GCash', n: '09•• ••• 1234' },
                      { k: 'maya', l: 'Maya', n: '09•• ••• 5678' },
                      { k: 'gotyme', l: 'GoTyme', n: '0123 4567 89' },
                    ].map(p => {
                      const sel = paymentMethod === p.k
                      return (
                        <button key={p.k} onClick={() => setPaymentMethod(p.k)} style={{
                          background: sel ? t.ink : '#FAF8F2', color: sel ? '#fff' : t.ink,
                          border: `1.5px solid ${sel ? t.ink : t.line}`, padding: '14px 12px', cursor: 'pointer', textAlign: 'left',
                        }}>
                          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 18, letterSpacing: '0.02em' }}>{p.l}</div>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', color: sel ? 'rgba(255,255,255,0.7)' : t.mute, marginTop: 4 }}>{p.n}</div>
                        </button>
                      )
                    })}
                  </div>
                  <div style={{ fontFamily: 'Archivo, sans-serif', fontSize: 13, color: t.mute, marginTop: 10, lineHeight: 1.5 }}>
                    Send <strong style={{ color: t.ink }}>₱700.00</strong> to the number above, then upload your receipt below.
                    Reference: <code style={{ background: '#FAF8F2', padding: '2px 6px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>SO-C{pickedSlot.court}-{date.getMonth() + 1}{String(date.getDate()).padStart(2, '0')}-{pickedSlot.hour}</code>
                  </div>
                </div>

                <div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em', color: t.mute, marginBottom: 8 }}>UPLOAD RECEIPT</div>
                  <label style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    border: `2px dashed ${receipt ? t.greenDeep : t.line2}`,
                    padding: '34px 18px', cursor: 'pointer', background: receipt ? '#F0FBE7' : '#FAF8F2',
                    fontFamily: 'Archivo, sans-serif', fontSize: 14, color: t.ink,
                  }}>
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) setReceipt(f.name) }} />
                    {receipt ? (
                      <>
                        <span style={{ width: 18, height: 18, background: t.greenDeep, color: '#fff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✓</span>
                        <span><strong>{receipt}</strong> · click to replace</span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 18 }}>↑</span>
                        <span>Tap to upload screenshot or photo of receipt</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div style={{ background: '#FAF8F2', border: `1.5px solid ${t.line}`, padding: '22px 22px', alignSelf: 'flex-start' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.28em', color: t.greenDeep }}>◆ ORDER SUMMARY</div>
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 36, color: t.ink, lineHeight: 0.95, margin: '8px 0 18px' }}>
                  COURT C{String(pickedSlot.court).padStart(2, '0')}<span style={{ color: t.green }}>.</span>
                </div>
                <Row k="DATE" v={fmtDate(date)} />
                <Row k="TIME" v={fmtTime(pickedSlot.hour)} />
                <Row k="DURATION" v="1 HOUR" />
                <Row k="PLAYERS" v="UP TO 4" />
                <div style={{ height: 1, background: t.line, margin: '14px 0' }} />
                <Row k="COURT FEE" v="₱700.00" />
                <Row k="SERVICE FEE" v="₱0.00" />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.22em', color: t.ink }}>TOTAL</span>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 34, color: t.ink }}>
                    ₱700<span style={{ fontSize: 18, color: t.mute }}>.00</span>
                  </span>
                </div>

                <div style={{ background: '#FFF6DC', border: `1px solid ${t.amber}`, padding: '10px 12px', marginTop: 16, fontFamily: 'Archivo, sans-serif', fontSize: 12, lineHeight: 1.5, color: '#6B5400' }}>
                  ⏱ Your slot will be <strong>held for 1 hour</strong> after you submit. We confirm by SMS once the receipt clears.
                </div>

                <button disabled={!receipt || !name || !phone} style={{
                  width: '100%', marginTop: 16,
                  background: (receipt && name && phone) ? t.green : '#CFD3CC',
                  color: (receipt && name && phone) ? '#04140A' : '#fff',
                  border: 'none', padding: '16px 0', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900,
                  fontSize: 18, letterSpacing: '0.06em',
                  cursor: (receipt && name && phone) ? 'pointer' : 'not-allowed', textTransform: 'uppercase',
                }}>
                  Confirm booking →
                </button>
                <button onClick={() => setStep(2)} style={{ width: '100%', marginTop: 8, background: 'transparent', color: t.mute, border: 'none', padding: '8px 0', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.22em', cursor: 'pointer' }}>
                  ← BACK TO SLOTS
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 32, flexWrap: 'wrap' }}>
          {[
            ['🔒', 'SLOT HELD 1 HR'],
            ['↻', 'FREE RESCHEDULE 24H'],
            ['SMS', 'CONFIRMATION'],
            ['₱', '₱700 FLAT'],
          ].map(([i, lbl], idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.22em', color: t.mute }}>
              <span style={{ background: '#fff', border: `1.5px solid ${t.line}`, width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: t.ink, fontWeight: 700 }}>{i}</span>
              <span>{lbl}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
