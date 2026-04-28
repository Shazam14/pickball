'use client'

// Concept B — Mobile booking flow, ported from SIDEPICK/design_handoff_sideout/mobile-booking.jsx.
// 4 screens: pick court → pick slot → pay → confirmation.
// Mock data only. Strict design parity with the handoff.

import { useState } from 'react'
import { LobbyPlanThumbnail } from '@/components/LobbyPlan'

const m = {
  bg: '#F4F2EC', card: '#FFFFFF', ink: '#0F1411', ink2: '#1F2924', mute: '#6B746F',
  muteSoft: '#8B948F', line: '#E0DCCE', line2: 'rgba(15,20,17,0.12)',
  green: '#1FD659', greenDeep: '#0E8B36', amber: '#F5C24A', red: '#E94E3D',
}

const COURT_SVG = '/concept-b/court-green.svg'

type Status = 'open' | 'filling' | 'live' | 'booked'
type SlotStatus = 'open' | 'held' | 'booked'

const COURTS: { n: number; status: Status; next: string; label?: string }[] = [
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
  open: { c: m.green, l: 'OPEN' },
  filling: { c: m.amber, l: 'FILLING' },
  live: { c: m.greenDeep, l: 'IN GAME' },
  booked: { c: m.red, l: 'BOOKED' },
}

function MNav({ title, onBack, step, total }: { title: string; onBack?: () => void; step: number; total: number }) {
  return (
    <div style={{ padding: '10px 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: m.bg, position: 'sticky', top: 0, zIndex: 5 }}>
      <button onClick={onBack} style={{ background: 'transparent', border: 'none', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: onBack ? 'pointer' : 'default', color: m.ink, fontSize: 22 }}>
        {onBack ? '‹' : ''}
      </button>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.22em', color: m.mute }}>STEP {step} OF {total}</div>
        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 18, letterSpacing: '0.02em', color: m.ink, textTransform: 'uppercase' }}>{title}</div>
      </div>
      <div style={{ width: 36, height: 36 }} />
    </div>
  )
}

function MProgress({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, padding: '0 16px 14px' }}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < step ? m.greenDeep : (i === step ? m.green : m.line) }} />
      ))}
    </div>
  )
}

function fmtTime(h: number) {
  const hh = ((h + 11) % 12) + 1
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh2 = (((h + 1) + 11) % 12) + 1
  const ampm2 = (h + 1) >= 12 ? 'PM' : 'AM'
  return `${hh}:00 ${ampm} – ${hh2}:00 ${ampm2}`
}

function Step1({ pick, setPick, onNext }: { pick: number; setPick: (n: number) => void; onNext: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: m.bg }}>
      <MNav title="PICK A COURT" step={1} total={3} />
      <MProgress step={0} total={3} />

      <div style={{ flex: 1, padding: '4px 16px 24px' }}>
        <div style={{ background: m.card, border: `1.5px solid ${m.line}`, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.22em', color: m.mute }}>BOOKING FOR</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 18, color: m.ink, textTransform: 'uppercase' }}>SAT · MAY 30 · 7PM</div>
          </div>
          <button style={{ background: m.ink, color: '#fff', border: 'none', padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em', fontWeight: 700 }}>CHANGE</button>
        </div>

        <div style={{ background: m.green, color: '#04140A', padding: '14px 14px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.22em', fontWeight: 700 }}>◆ FASTEST OPEN</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 22, lineHeight: 1, marginTop: 2 }}>COURT 01 · 7PM</div>
          </div>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 24 }}>→</span>
        </div>

        <div data-tour="lobby" style={{ marginBottom: 14 }}>
          <LobbyPlanThumbnail />
        </div>

        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em', color: m.mute, margin: '4px 0 10px' }}>ALL COURTS · TAP TO PICK</div>

        <div data-tour="court-area" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {COURTS.map(ct => {
            const meta = META[ct.status]
            const isSel = pick === ct.n
            const disabled = ct.status === 'booked'
            return (
              <button key={ct.n} onClick={() => !disabled && setPick(ct.n)} style={{
                background: m.card, border: `1.5px solid ${isSel ? m.ink : m.line}`,
                padding: 12, cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left',
                opacity: disabled ? 0.55 : 1, display: 'flex', gap: 12, alignItems: 'center',
              }}>
                <img src={COURT_SVG} alt="" style={{ width: 108, height: 54, objectFit: 'cover', flex: '0 0 auto', filter: disabled ? 'saturate(0.4)' : 'none' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 24, color: m.ink, lineHeight: 0.9 }}>C{String(ct.n).padStart(2, '0')}</span>
                    {ct.label && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, letterSpacing: '0.18em', color: m.mute }}>{ct.label}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <span style={{ width: 7, height: 7, background: meta.c, display: 'inline-block' }} />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', color: meta.c, fontWeight: 700 }}>{meta.l}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.18em', color: m.mute, marginLeft: 4 }}>· NEXT {ct.next}</span>
                  </div>
                </div>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 24, color: isSel ? m.green : m.mute }}>{isSel ? '✓' : '›'}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ position: 'sticky', bottom: 0, padding: '14px 16px 22px', background: m.bg, borderTop: `1px solid ${m.line}`, boxShadow: '0 -4px 12px rgba(0,0,0,0.04)' }}>
        <button onClick={onNext} style={{ width: '100%', background: m.ink, color: '#fff', border: 'none', padding: '16px 0', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 18, letterSpacing: '0.06em', cursor: 'pointer', textTransform: 'uppercase' }}>
          PICK SLOT FOR C{String(pick).padStart(2, '0')} →
        </button>
      </div>
    </div>
  )
}

function Step2({ pick, slot, setSlot, onBack, onNext }: { pick: number; slot: { court: number; hour: number } | null; setSlot: (s: { court: number; hour: number } | null) => void; onBack: () => void; onNext: () => void }) {
  const [date, setDate] = useState(new Date(2026, 4, 30))
  const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const slots: { hour: number; status: SlotStatus }[] = []
  for (let h = 6; h < 22; h++) {
    const status: SlotStatus = (h === 18 || h === 19) ? 'booked' : (h === 17 || h === 20) ? 'held' : 'open'
    slots.push({ hour: h, status })
  }
  const periodOf = (h: number) => h < 11 ? 'MORNING' : h < 14 ? 'MIDDAY' : h < 17 ? 'AFTERNOON' : h < 20 ? 'EVENING' : 'NIGHT'
  const groups: Record<string, { hour: number; status: SlotStatus }[]> = {}
  slots.forEach(s => {
    const p = periodOf(s.hour)
    ;(groups[p] = groups[p] || []).push(s)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: m.bg }}>
      <MNav title="PICK YOUR SLOT" step={2} total={3} onBack={onBack} />
      <MProgress step={1} total={3} />

      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ background: m.card, border: `1.5px solid ${m.line}`, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={COURT_SVG} alt="" style={{ width: 80, height: 36, objectFit: 'cover' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 18, color: m.ink, lineHeight: 1 }}>COURT C{String(pick).padStart(2, '0')}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.18em', color: m.mute, marginTop: 3 }}>OUTDOOR · ₱700/HR</div>
          </div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em', color: m.greenDeep, fontWeight: 700, background: 'rgba(31,214,89,0.15)', padding: '4px 8px' }}>CHANGE</span>
        </div>
      </div>

      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: m.card, border: `1.5px solid ${m.line}`, padding: '10px 14px' }}>
          <button onClick={() => setDate(d => { const x = new Date(d); x.setDate(x.getDate() - 1); return x })} style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: m.ink, padding: '4px 8px' }}>‹</button>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 18, color: m.ink, letterSpacing: '0.02em' }}>{fmtDate(date)}</span>
          <button onClick={() => setDate(d => { const x = new Date(d); x.setDate(x.getDate() + 1); return x })} style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: m.ink, padding: '4px 8px' }}>›</button>
        </div>
      </div>

      <div style={{ padding: '0 16px 10px', display: 'flex', gap: 12 }}>
        {[['Available', m.green], ['Held', m.amber], ['Booked', m.red]].map(([l, c]) => (
          <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.18em', color: m.mute }}>
            <span style={{ width: 7, height: 7, background: c, display: 'inline-block' }} /> {l.toUpperCase()}
          </span>
        ))}
      </div>

      <div style={{ flex: 1, padding: '0 16px 24px' }}>
        {Object.entries(groups).map(([period, list]) => (
          <div key={period} style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 14, color: m.mute, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '8px 0 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>{period}</span>
              <span style={{ flex: 1, height: 1, background: m.line }} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: m.muteSoft, letterSpacing: '0.18em' }}>{list.filter(s => s.status === 'open').length} OPEN</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {list.map(s => {
                const isSel = slot?.court === pick && slot?.hour === s.hour
                const disabled = s.status === 'booked' || s.status === 'held'
                let bg = m.card, fg = m.ink, borderColor = m.line
                if (s.status === 'booked') { bg = '#FCEDEA'; fg = m.red }
                else if (s.status === 'held') { bg = '#FFF6DC'; fg = '#A07300' }
                if (isSel) { bg = m.green; fg = '#04140A'; borderColor = m.ink }
                return (
                  <button key={s.hour} onClick={() => !disabled && setSlot({ court: pick, hour: s.hour })} disabled={disabled} style={{
                    background: bg, color: fg, border: `1.5px solid ${borderColor}`,
                    padding: '14px 10px', textAlign: 'left',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 16, letterSpacing: '0.02em',
                    opacity: disabled ? 0.85 : 1,
                  }}>
                    <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.16em', opacity: 0.7, fontWeight: 700, marginBottom: 4 }}>
                      {s.status === 'booked' ? 'BOOKED' : s.status === 'held' ? 'HELD' : isSel ? 'SELECTED' : 'OPEN'}
                    </div>
                    {fmtTime(s.hour)}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ position: 'sticky', bottom: 0, padding: '14px 16px 22px', background: m.bg, borderTop: `1px solid ${m.line}` }}>
        <button onClick={onNext} disabled={!slot} style={{
          width: '100%', background: slot ? m.ink : '#CFD3CC', color: '#fff', border: 'none',
          padding: '16px 0', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 18,
          letterSpacing: '0.06em', cursor: slot ? 'pointer' : 'not-allowed', textTransform: 'uppercase',
        }}>
          {slot ? `CONTINUE · ${fmtTime(slot.hour).split('–')[0].trim()} →` : 'PICK A SLOT'}
        </button>
      </div>
    </div>
  )
}

function Step3({ pick, slot, onBack, onNext }: { pick: number; slot: { court: number; hour: number } | null; onBack: () => void; onNext: () => void }) {
  const [paymentMethod, setPaymentMethod] = useState('gcash')
  const [receipt, setReceipt] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const ready = !!(receipt && name && phone)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: m.bg }}>
      <MNav title="PAY + UPLOAD" step={3} total={3} onBack={onBack} />
      <MProgress step={2} total={3} />

      <div style={{ flex: 1, padding: '0 16px 24px' }}>
        <div style={{ background: m.ink, color: '#fff', padding: '18px 16px', marginBottom: 18 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.28em', color: m.green }}>◆ YOUR BOOKING</div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 34, lineHeight: 1, margin: '8px 0 12px' }}>
            COURT C{String(pick).padStart(2, '0')}<span style={{ color: m.green }}>.</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.18em' }}>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>SAT, MAY 30</span>
            <span style={{ color: '#fff', fontWeight: 700 }}>{slot ? fmtTime(slot.hour) : ''}</span>
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.15)', margin: '14px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.6)' }}>TOTAL</span>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 34 }}>
              ₱700<span style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>.00</span>
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em', color: m.mute, marginBottom: 8 }}>PAY VIA</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ k: 'gcash', l: 'GCash' }, { k: 'maya', l: 'Maya' }, { k: 'gotyme', l: 'GoTyme' }].map(p => {
              const sel = paymentMethod === p.k
              return (
                <button key={p.k} onClick={() => setPaymentMethod(p.k)} style={{
                  flex: 1, background: sel ? m.ink : m.card, color: sel ? '#fff' : m.ink,
                  border: `1.5px solid ${sel ? m.ink : m.line}`, padding: '14px 8px',
                  fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 16, letterSpacing: '0.04em', cursor: 'pointer',
                }}>{p.l}</button>
              )
            })}
          </div>
        </div>

        <div style={{ background: m.card, border: `1.5px solid ${m.line}`, padding: 14, marginBottom: 18 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.22em', color: m.mute }}>SEND ₱700 TO</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 22, color: m.ink, letterSpacing: '0.02em' }}>0917 555 1234</span>
            <button style={{ background: m.green, color: '#04140A', border: 'none', padding: '8px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em', fontWeight: 700 }}>COPY</button>
          </div>
          <div style={{ fontFamily: 'Archivo, sans-serif', fontSize: 12, color: m.mute, marginTop: 8 }}>
            Reference: <code style={{ background: m.bg, padding: '2px 6px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>SO-C{pick}-0530-{slot ? slot.hour : ''}</code>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em', color: m.mute, marginBottom: 8 }}>YOUR INFO</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={{ width: '100%', padding: 14, border: `1.5px solid ${m.line}`, fontSize: 14, fontFamily: 'Archivo, sans-serif', background: m.card, marginBottom: 8, boxSizing: 'border-box', outline: 'none' }} />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Mobile (09…)" style={{ width: '100%', padding: 14, border: `1.5px solid ${m.line}`, fontSize: 14, fontFamily: 'Archivo, sans-serif', background: m.card, boxSizing: 'border-box', outline: 'none' }} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em', color: m.mute, marginBottom: 8 }}>UPLOAD RECEIPT</div>
          <label style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            border: `2px dashed ${receipt ? m.greenDeep : m.line2}`, padding: '28px 14px',
            cursor: 'pointer', background: receipt ? '#F0FBE7' : m.card,
            fontFamily: 'Archivo, sans-serif', fontSize: 13, color: m.ink, textAlign: 'center',
          }}>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) setReceipt(f.name) }} />
            {receipt
              ? <><span style={{ width: 18, height: 18, background: m.greenDeep, color: '#fff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✓</span><span><strong>{receipt}</strong></span></>
              : <><span style={{ fontSize: 18 }}>↑</span><span>Tap to upload screenshot</span></>}
          </label>
        </div>

        <div style={{ background: '#FFF6DC', border: `1px solid ${m.amber}`, padding: 12, fontFamily: 'Archivo, sans-serif', fontSize: 12, lineHeight: 1.5, color: '#6B5400' }}>
          ⏱ Slot held for <strong>1 hour</strong> after submit. SMS confirms once receipt clears.
        </div>
      </div>

      <div style={{ position: 'sticky', bottom: 0, padding: '14px 16px 22px', background: m.bg, borderTop: `1px solid ${m.line}` }}>
        <button onClick={onNext} disabled={!ready} style={{
          width: '100%', background: ready ? m.green : '#CFD3CC', color: ready ? '#04140A' : '#fff', border: 'none',
          padding: '16px 0', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 18,
          letterSpacing: '0.06em', cursor: ready ? 'pointer' : 'not-allowed', textTransform: 'uppercase',
        }}>
          CONFIRM BOOKING →
        </button>
      </div>
    </div>
  )
}

function RowDk({ k, v, green }: { k: string; v: string; green?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.5)' }}>{k}</span>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.16em', color: green ? m.green : '#fff', fontWeight: 700, textAlign: 'right' }}>{v}</span>
    </div>
  )
}

function Confirm({ pick, slot, onDone }: { pick: number; slot: { court: number; hour: number } | null; onDone: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'linear-gradient(180deg, #07090A 0%, #0E1410 60%, #142B1F 100%)' }}>
      <div style={{ flex: 1, padding: '52px 22px 22px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 20, marginBottom: 24 }}>
          <div style={{ width: 84, height: 84, borderRadius: '50%', background: m.green, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 12px rgba(31,214,89,0.18), 0 0 60px rgba(31,214,89,0.4)' }}>
            <span style={{ color: '#04140A', fontSize: 42, fontWeight: 900 }}>✓</span>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.32em', color: m.green, marginTop: 18 }}>
            ◆ SLOT HELD · 1:00:00
          </div>
          <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 46, color: '#fff', margin: '8px 0 4px', textAlign: 'center', lineHeight: 0.95, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
            YOU&apos;RE IN<span style={{ color: m.green }}>.</span>
          </h2>
          <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', margin: '0 0 4px', lineHeight: 1.5 }}>
            We&apos;ll confirm by SMS once your receipt clears.<br />Usually under 5 minutes.
          </p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)', padding: '18px 16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.5)' }}>BOOKING</div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 28, color: '#fff', lineHeight: 0.95, marginTop: 4 }}>COURT C{String(pick).padStart(2, '0')}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.5)' }}>REF</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#fff', marginTop: 4, fontWeight: 700 }}>#SO-C{pick}-{slot ? slot.hour : '19'}</div>
            </div>
          </div>
          <img src={COURT_SVG} alt="" style={{ width: '100%', display: 'block', borderRadius: 2, marginBottom: 14 }} />
          <RowDk k="DATE" v="SAT · MAY 30, 2026" />
          <RowDk k="TIME" v={slot ? fmtTime(slot.hour) : '7:00 PM – 8:00 PM'} />
          <RowDk k="PAID" v="₱700.00 · GCASH" />
          <RowDk k="STATUS" v="HELD · AWAITING CONFIRMATION" green />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <button style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', padding: '14px 0', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 14, letterSpacing: '0.06em', cursor: 'pointer', textTransform: 'uppercase' }}>↓ Add to calendar</button>
          <button style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', padding: '14px 0', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 14, letterSpacing: '0.06em', cursor: 'pointer', textTransform: 'uppercase' }}>⤴ Share court</button>
        </div>

        <button onClick={onDone} style={{
          width: '100%', marginTop: 'auto', background: m.green, color: '#04140A', border: 'none',
          padding: '16px 0', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 18,
          letterSpacing: '0.06em', cursor: 'pointer', textTransform: 'uppercase',
        }}>
          DONE
        </button>
      </div>
    </div>
  )
}

export default function MobileFlow() {
  const [step, setStep] = useState(1)
  const [pick, setPick] = useState(3)
  const [slot, setSlot] = useState<{ court: number; hour: number } | null>({ court: 3, hour: 19 })

  return (
    <>
      {step === 1 && <Step1 pick={pick} setPick={setPick} onNext={() => setStep(2)} />}
      {step === 2 && <Step2 pick={pick} slot={slot} setSlot={setSlot} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
      {step === 3 && <Step3 pick={pick} slot={slot} onBack={() => setStep(2)} onNext={() => setStep(4)} />}
      {step === 4 && <Confirm pick={pick} slot={slot} onDone={() => setStep(1)} />}
    </>
  )
}
