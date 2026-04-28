'use client'

// Architectural pencil-style lobby plan, ported from
// SIDEPICK/design_handoff_sideout/lobby-plan.jsx.
//
// Exports two triggers (cream thumbnail for Concept B, dark icon button for
// Concept A) and shares one expandable modal that shows the full plan + legend.

import { useEffect, useId, useState } from 'react'

const PALETTE = {
  paper: '#EFE8D6',
  grid: '#D8CFB6',
  ink: '#2A2620',
  inkSoft: '#5C5446',
  wash: '#E6DCC0',
  annotation: '#6B5B3A',
}

function LobbyPlanSVG({ idPrefix }: { idPrefix: string }) {
  const sketchy = `url(#${idPrefix}-sketchy)`
  const { ink, inkSoft, paper, wash, grid, annotation } = PALETTE
  return (
    <svg viewBox="0 0 1200 760" width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
      <defs>
        <filter id={`${idPrefix}-sketchy`} x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves={2} seed={3} result="t" />
          <feDisplacementMap in="SourceGraphic" in2="t" scale={1.4} />
        </filter>
        <pattern id={`${idPrefix}-hatchLight`} patternUnits="userSpaceOnUse" width={9} height={9} patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={9} stroke={inkSoft} strokeWidth={0.4} opacity={0.25} />
        </pattern>
        <pattern id={`${idPrefix}-paperGrid`} patternUnits="userSpaceOnUse" width={20} height={20}>
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={grid} strokeWidth={0.4} opacity={0.5} />
        </pattern>
      </defs>

      <rect x={0} y={0} width={1200} height={760} fill={`url(#${idPrefix}-paperGrid)`} />

      {/* Inverted-T outer wall */}
      <g filter={sketchy} fill="none" stroke={ink} strokeLinejoin="round" strokeLinecap="round">
        <path d="M 120 80 L 1080 80 L 1080 280 L 660 280 L 660 560 L 540 560 L 540 280 L 120 280 Z" fill={wash} stroke="none" />
        <path d="M 120 80 L 1080 80 L 1080 280 L 660 280 L 660 560 L 540 560 L 540 280 L 120 280 Z" strokeWidth={3.5} />
        <path d="M 124 84 L 1076 84 L 1076 276 L 656 276 L 656 556 L 544 556 L 544 276 L 124 276 Z" strokeWidth={0.6} opacity={0.5} />
      </g>

      {/* Entrance */}
      <g filter={sketchy} stroke={ink} fill="none" strokeWidth={1.6} strokeLinecap="round">
        <path d="M 240 80 L 320 80" stroke={paper} strokeWidth={6} />
        <path d="M 240 80 L 320 80" stroke={ink} strokeWidth={1.6} strokeDasharray="3 3" />
        <path d="M 240 80 A 80 80 0 0 1 320 130 L 320 80" />
        <line x1={320} y1={80} x2={320} y2={130} />
      </g>
      <text x={280} y={68} fontSize={11} fill={ink} textAnchor="middle" style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, letterSpacing: '0.18em' }}>ENTRANCE</text>
      <line x1={200} y1={56} x2={360} y2={56} stroke={ink} strokeWidth={0.8} />
      <line x1={200} y1={50} x2={200} y2={62} stroke={ink} strokeWidth={0.8} />
      <line x1={360} y1={50} x2={360} y2={62} stroke={ink} strokeWidth={0.8} />

      {/* Internal partitions */}
      <g filter={sketchy} fill="none" stroke={ink} strokeWidth={1.4} strokeLinecap="round">
        <line x1={430} y1={120} x2={430} y2={280} />
        <line x1={770} y1={120} x2={770} y2={280} />
        <line x1={430} y1={120} x2={500} y2={120} />
        <line x1={700} y1={120} x2={770} y2={120} />
        <line x1={430} y1={200} x2={540} y2={200} stroke={ink} strokeWidth={0.6} strokeDasharray="3 3" opacity={0.45} />
        <line x1={660} y1={200} x2={770} y2={200} stroke={ink} strokeWidth={0.6} strokeDasharray="3 3" opacity={0.45} />
      </g>

      {/* Restrooms */}
      <rect x={124} y={84} width={306} height={194} fill={`url(#${idPrefix}-hatchLight)`} opacity={0.7} />
      <line x1={277} y1={84} x2={277} y2={278} stroke={ink} strokeWidth={1} filter={sketchy} />
      <g stroke={ink} strokeWidth={0.9} fill="none" filter={sketchy}>
        <rect x={140} y={110} width={22} height={32} rx={3} />
        <rect x={140} y={148} width={22} height={32} rx={3} />
        <rect x={140} y={186} width={22} height={32} rx={3} />
        <rect x={180} y={92} width={20} height={14} rx={3} />
        <rect x={208} y={92} width={20} height={14} rx={3} />
        <rect x={236} y={92} width={20} height={14} rx={3} />
        <ellipse cx={180} cy={248} rx={14} ry={10} />
        <ellipse cx={220} cy={248} rx={14} ry={10} />
        <ellipse cx={260} cy={248} rx={14} ry={10} />
        <rect x={290} y={110} width={22} height={34} rx={3} />
        <rect x={290} y={150} width={22} height={34} rx={3} />
        <rect x={290} y={190} width={22} height={34} rx={3} />
        <rect x={320} y={110} width={22} height={34} rx={3} />
        <rect x={320} y={150} width={22} height={34} rx={3} />
        <ellipse cx={370} cy={120} rx={14} ry={10} />
        <ellipse cx={370} cy={160} rx={14} ry={10} />
        <ellipse cx={370} cy={200} rx={14} ry={10} />
        <ellipse cx={370} cy={240} rx={14} ry={10} />
      </g>
      <text x={200} y={168} fontSize={48} fill={ink} textAnchor="middle" opacity={0.28} style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontStyle: 'italic' }}>M</text>
      <text x={350} y={174} fontSize={48} fill={ink} textAnchor="middle" opacity={0.28} style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontStyle: 'italic' }}>F</text>
      <text x={277} y={312} fontSize={12} fill={ink} textAnchor="middle" style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.32em', fontWeight: 700 }}>01 · RESTROOMS</text>

      {/* Reception / Vestibule */}
      <g filter={sketchy} stroke={ink} fill={paper} strokeWidth={1.4}>
        <path d="M 470 165 Q 470 155 480 155 L 720 155 Q 730 155 730 165 L 730 195 Q 730 205 720 205 L 480 205 Q 470 205 470 195 Z" fill="#E0D5B0" />
        <rect x={490} y={170} width={220} height={20} fill={paper} stroke={ink} strokeWidth={0.6} />
      </g>
      <text x={600} y={186} fontSize={10} fill={ink} textAnchor="middle" style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.3em', fontWeight: 700 }}>RECEPTION</text>
      <g filter={sketchy} stroke={ink} fill="none" strokeWidth={1}>
        <rect x={450} y={100} width={60} height={14} />
        <rect x={690} y={100} width={60} height={14} />
      </g>
      <text x={600} y={312} fontSize={12} fill={ink} textAnchor="middle" style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.32em', fontWeight: 700 }}>02 · CHECK-IN · VESTIBULE</text>

      {/* Lounge / Café */}
      <rect x={774} y={84} width={302} height={194} fill={`url(#${idPrefix}-hatchLight)`} opacity={0.55} />
      <g filter={sketchy} stroke={ink} fill="none" strokeWidth={1.4}>
        <path d="M 790 100 L 1060 100 L 1060 130 L 1040 130 L 1040 116 L 790 116 Z" fill="#E0D5B0" stroke={ink} />
        <line x1={900} y1={100} x2={900} y2={116} />
        {[820, 850, 880, 920, 950, 980, 1010, 1040].map((cx, i) => (
          <circle key={i} cx={cx} cy={130} r={6} />
        ))}
      </g>
      <text x={930} y={111} fontSize={9} fill={ink} textAnchor="middle" style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.28em', fontWeight: 700 }}>CAFÉ COUNTER</text>
      <g filter={sketchy} stroke={ink} fill="none" strokeWidth={1}>
        <circle cx={820} cy={190} r={20} /><circle cx={820} cy={166} r={7} /><circle cx={820} cy={214} r={7} /><circle cx={796} cy={190} r={7} /><circle cx={844} cy={190} r={7} />
        <circle cx={900} cy={190} r={20} /><circle cx={900} cy={166} r={7} /><circle cx={900} cy={214} r={7} /><circle cx={876} cy={190} r={7} /><circle cx={924} cy={190} r={7} />
        <circle cx={980} cy={190} r={20} /><circle cx={980} cy={166} r={7} /><circle cx={980} cy={214} r={7} /><circle cx={956} cy={190} r={7} /><circle cx={1004} cy={190} r={7} />
        <rect x={788} y={240} width={60} height={20} rx={3} />
        <rect x={868} y={240} width={60} height={20} rx={3} />
        <rect x={948} y={240} width={60} height={20} rx={3} />
        <rect x={808} y={226} width={20} height={10} rx={2} />
        <rect x={888} y={226} width={20} height={10} rx={2} />
        <rect x={968} y={226} width={20} height={10} rx={2} />
      </g>
      <text x={924} y={312} fontSize={12} fill={ink} textAnchor="middle" style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.32em', fontWeight: 700 }}>03 · LOUNGE · CAFÉ</text>

      {/* Corridor */}
      <rect x={544} y={284} width={112} height={272} fill={`url(#${idPrefix}-hatchLight)`} opacity={0.4} />
      <line x1={600} y1={290} x2={600} y2={552} stroke={ink} strokeWidth={0.6} strokeDasharray="4 5" opacity={0.6} />
      <g fill={annotation} opacity={0.7}>
        {[330, 380, 430, 480, 530].map((y, i) => (
          <g key={i} transform={`translate(600 ${y})`}><path d="M -5 0 L 5 0 L 0 8 Z" /></g>
        ))}
      </g>
      <text x={600} y={600} fontSize={11} fill={ink} textAnchor="middle" style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.32em', fontWeight: 700 }}>04 · CORRIDOR TO COURTS</text>

      {/* Courts hint */}
      <g stroke={ink} fill="none" strokeWidth={1} strokeDasharray="6 5" opacity={0.55}>
        <line x1={160} y1={640} x2={540} y2={640} />
        <line x1={660} y1={640} x2={1040} y2={640} />
        <line x1={160} y1={640} x2={160} y2={710} />
        <line x1={1040} y1={640} x2={1040} y2={710} />
        <line x1={160} y1={710} x2={1040} y2={710} />
      </g>
      <text x={600} y={670} fontSize={13} fill={ink} textAnchor="middle" style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, letterSpacing: '0.32em', fontStyle: 'italic' }}>— TO COURTS  →</text>
      <text x={600} y={694} fontSize={10} fill={annotation} textAnchor="middle" style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.22em' }}>10 PRO COURTS · CONT&apos;D ON DWG A.02</text>

      {/* Dimensions */}
      <g stroke={ink} strokeWidth={0.7} fill={ink} opacity={0.7} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        <line x1={120} y1={46} x2={1080} y2={46} />
        <line x1={120} y1={40} x2={120} y2={52} />
        <line x1={1080} y1={40} x2={1080} y2={52} />
        <text x={600} y={36} fontSize={10} textAnchor="middle" letterSpacing="0.18em">48 000</text>
      </g>
      <g stroke={ink} strokeWidth={0.7} fill={ink} opacity={0.7} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        <line x1={1100} y1={80} x2={1100} y2={280} />
        <line x1={1094} y1={80} x2={1106} y2={80} />
        <line x1={1094} y1={280} x2={1106} y2={280} />
        <text x={1110} y={184} fontSize={10} textAnchor="start" letterSpacing="0.18em">10 000</text>
      </g>
      <g stroke={ink} strokeWidth={0.7} fill={ink} opacity={0.7} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        <line x1={540} y1={600} x2={660} y2={600} />
        <line x1={540} y1={594} x2={540} y2={606} />
        <line x1={660} y1={594} x2={660} y2={606} />
        <text x={600} y={618} fontSize={10} textAnchor="middle" letterSpacing="0.18em">6 000</text>
      </g>
      <g stroke={ink} strokeWidth={0.7} fill={ink} opacity={0.7} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        <line x1={500} y1={280} x2={500} y2={560} />
        <line x1={494} y1={280} x2={506} y2={280} />
        <line x1={494} y1={560} x2={506} y2={560} />
        <text x={488} y={424} fontSize={10} textAnchor="end" letterSpacing="0.18em">14 000</text>
      </g>
    </svg>
  )
}

function LobbyPlanFull({ idPrefix }: { idPrefix: string }) {
  const { paper, grid, ink, inkSoft, annotation } = PALETTE
  return (
    <section style={{ background: paper, padding: '52px 32px 56px', borderTop: `1px solid #C8BE9C`, borderBottom: `1px solid #C8BE9C` }}>
      <div style={{ maxWidth: 1280, margin: '0 auto 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.3em', color: annotation }}>— DRAWING NO. 01 · GROUND FLOOR PLAN</div>
          <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 'clamp(48px, 6vw, 84px)', color: ink, margin: '12px 0 8px', lineHeight: 0.9, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
            BEFORE THE BASELINE<span style={{ color: '#7A6A3A' }}>.</span>
          </h2>
          <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 15, lineHeight: 1.6, color: inkSoft, margin: 0, maxWidth: 560 }}>
            Walk in, settle in, suit up — the lobby is a wide bar across the front, then a single corridor down to the ten courts.
            Restrooms left, lounge &amp; café seating right.
          </p>
        </div>
        <div style={{ textAlign: 'right', borderLeft: `1px solid ${grid}`, paddingLeft: 24 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em', color: annotation }}>SCALE</div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 22, color: ink, lineHeight: 1, marginTop: 3 }}>1 : 200</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em', color: annotation, marginTop: 14 }}>SHEET</div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 22, color: ink, lineHeight: 1, marginTop: 3 }}>A.01 / 06</div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', background: paper, border: `1px solid ${grid}`, boxShadow: `0 10px 40px rgba(58,40,12,0.08), inset 0 0 0 6px ${paper}, inset 0 0 0 7px ${grid}`, padding: '36px 24px 26px', position: 'relative' }}>
        <LobbyPlanSVG idPrefix={idPrefix} />
      </div>

      <div style={{ maxWidth: 1280, margin: '24px auto 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24 }}>
        {[
          { k: '01', l: 'RESTROOMS', d: 'M / F · showers off the changing rooms.' },
          { k: '02', l: 'CHECK-IN · VESTIBULE', d: 'Reception desk, paddle rentals, two waiting benches.' },
          { k: '03', l: 'LOUNGE · CAFÉ', d: 'Counter seating + three round tables + sofa cluster facing the courts.' },
          { k: '04', l: 'CORRIDOR', d: 'Single 6m-wide spine straight to all ten courts.' },
        ].map(a => (
          <div key={a.k} style={{ borderTop: `1px solid ${ink}`, paddingTop: 14 }}>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 38, color: ink, lineHeight: 1, fontStyle: 'italic' }}>{a.k}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em', color: annotation, marginTop: 4, fontWeight: 700 }}>{a.l}</div>
            <div style={{ fontFamily: 'Archivo, sans-serif', fontSize: 13, color: inkSoft, marginTop: 8, lineHeight: 1.5 }}>{a.d}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Modal({ open, onClose, idPrefix }: { open: boolean; onClose: () => void; idPrefix: string }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])

  if (!open) return null
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      zIndex: 400, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '40px 16px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 1340, width: '100%', position: 'relative' }}>
        <button onClick={onClose} aria-label="Close" style={{
          position: 'sticky', top: 16, marginLeft: 'auto', display: 'block',
          background: PALETTE.ink, color: '#fff', border: 'none',
          width: 40, height: 40, fontSize: 22, cursor: 'pointer', zIndex: 1,
          fontFamily: 'system-ui', lineHeight: 1,
        }}>×</button>
        <LobbyPlanFull idPrefix={idPrefix} />
      </div>
    </div>
  )
}

// Concept B — cream thumbnail inline near the court area.
export function LobbyPlanThumbnail() {
  const id = useId()
  const idPrefix = id.replace(/[:]/g, '_')
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} type="button" style={{
        background: PALETTE.paper, border: `1.5px solid ${PALETTE.grid}`,
        padding: 8, cursor: 'pointer', textAlign: 'left', width: '100%',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ width: 120, flexShrink: 0 }}>
          <LobbyPlanSVG idPrefix={`${idPrefix}-thumb`} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.22em', color: PALETTE.annotation, fontWeight: 700 }}>VENUE LAYOUT</div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 18, color: PALETTE.ink, marginTop: 2, lineHeight: 1 }}>BEFORE THE BASELINE</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.18em', color: PALETTE.annotation, marginTop: 6 }}>TAP TO EXPAND →</div>
        </div>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} idPrefix={`${idPrefix}-modal`} />
    </>
  )
}

// Concept A — small dark icon button that opens the modal.
export function LobbyPlanButton({ className }: { className?: string }) {
  const id = useId()
  const idPrefix = id.replace(/[:]/g, '_')
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} type="button" className={className}>
        <span aria-hidden>⌗</span>
        <span>VIEW VENUE LAYOUT</span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} idPrefix={`${idPrefix}-modal`} />
    </>
  )
}
