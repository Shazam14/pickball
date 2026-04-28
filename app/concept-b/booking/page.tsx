'use client'

// Concept B booking — visual prototype only (mock data, no Supabase, no submit).
// Mirrors Concept A's reserve / walking-in split. Renders mobile or desktop layout
// based on viewport. Toggle back to /booking lives in the top bar.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import DesktopFlow from './DesktopFlow'
import MobileFlow from './MobileFlow'
import TourButton, { type TourStep } from '@/components/TourButton'

const TOUR_B_STEPS: TourStep[] = [
  {
    element: '[data-tour-b="topbar"]',
    popover: {
      title: 'Concept B · Design Preview',
      description: 'This is a <b>visual prototype</b> — mock data, no real submit. Use it to compare the look & feel against Concept A.',
      side: 'bottom', align: 'center',
    },
  },
  {
    element: '[data-tour-b="mode"]',
    popover: {
      title: 'Reserve or Walk-in',
      description: 'Same split as Concept A: <b>Reserve</b> for online booking with held slots, <b>Walking In</b> for show-up-and-pay.',
      side: 'bottom', align: 'center',
    },
  },
  {
    element: '[data-tour="lobby"]',
    popover: {
      title: 'Venue layout',
      description: 'Architectural sketch of the lobby — entrance, restrooms, lounge, corridor to the courts. <b>Tap to expand.</b>',
      side: 'left', align: 'center',
    },
  },
  {
    element: '[data-tour="court-area"]',
    popover: {
      title: 'Pick a court',
      description: 'Desktop: 2-column grid with status dots. Mobile: vertical list with thumbnails. Booked courts are dimmed.',
      side: 'top', align: 'center',
    },
  },
  {
    element: '[data-tour="step-indicator"]',
    popover: {
      title: '3-step funnel',
      description: 'Pick court → Pick slot → Pay & upload receipt. You can jump steps freely in this preview.',
      side: 'bottom', align: 'center',
    },
  },
  {
    element: '[data-tour-b="back-to-a"]',
    popover: {
      title: 'Back to Concept A',
      description: 'When you&apos;re done previewing, this takes you back to the live booking flow.',
      side: 'bottom', align: 'end',
    },
  },
]

const t = {
  bg: '#F4F2EC', ink: '#0F1411', mute: '#6B746F', line: '#D9D5C9',
  green: '#1FD659', greenDeep: '#0E8B36',
}

type Mode = 'reserve' | 'walkin'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

function TopBar() {
  return (
    <div data-tour-b="topbar" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px', background: t.ink, color: '#fff',
      borderBottom: `1px solid ${t.greenDeep}`, gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.28em', color: t.green, fontWeight: 700 }}>
        ◆ CONCEPT B · DESIGN PREVIEW
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <TourButton
          storageKey="pickball:tour:b:seen"
          steps={TOUR_B_STEPS}
          label="↻ TAKE A TOUR"
          className="cb-tour-btn"
        />
        <Link href="/booking" data-tour-b="back-to-a" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
          padding: '6px 12px', textDecoration: 'none', color: '#fff',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          <span style={{ width: 14, height: 14, borderRadius: '50%', background: t.green, display: 'inline-block' }} />
          ← BACK TO A
        </Link>
      </div>
    </div>
  )
}

function ModeChooser({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  return (
    <div style={{ background: t.bg, padding: '24px 20px 0' }}>
      <div data-tour-b="mode" style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {([
          { k: 'reserve', title: 'RESERVE A COURT', sub: 'Online booking · pay first · slot held' },
          { k: 'walkin', title: 'WALKING IN', sub: 'No reservation · pay at the venue' },
        ] as const).map(opt => {
          const sel = mode === opt.k
          return (
            <button key={opt.k} onClick={() => setMode(opt.k)} style={{
              background: sel ? '#fff' : 'transparent',
              border: `1.5px solid ${sel ? t.ink : t.line}`,
              padding: '18px 20px', textAlign: 'left', cursor: 'pointer',
            }}>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 22, color: t.ink, letterSpacing: '0.02em' }}>
                {opt.title}{sel && <span style={{ color: t.green }}>.</span>}
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', color: t.mute, marginTop: 6 }}>
                {opt.sub}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function WalkinCard() {
  return (
    <section style={{ background: t.bg, padding: '32px 20px 80px', minHeight: 'calc(100vh - 110px)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', background: '#fff', border: `1.5px solid ${t.line}`, padding: '32px 28px' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.3em', color: t.greenDeep }}>
          — JUST WALK IN
        </div>
        <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 42, color: t.ink, margin: '10px 0 16px', lineHeight: 0.95, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
          NO RESERVATION<span style={{ color: t.green }}>.</span>
        </h2>
        <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 15, color: t.mute, lineHeight: 1.6, margin: '0 0 24px' }}>
          Show up, pay at the counter, and play whichever court is open. No upfront payment, no holds.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginTop: 8 }}>
          <div style={{ background: '#FAF8F2', border: `1.5px solid ${t.line}`, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em', color: t.mute }}>HOURS</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 22, color: t.ink, marginTop: 4 }}>OPEN 24 / 7</div>
          </div>
          <div style={{ background: '#FAF8F2', border: `1.5px solid ${t.line}`, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em', color: t.mute }}>WHERE</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 22, color: t.ink, marginTop: 4 }}>MANDAUE, CEBU</div>
          </div>
        </div>

        <div style={{ background: '#FFF6DC', border: `1px solid #F5C24A`, padding: '12px 14px', marginTop: 20, fontFamily: 'Archivo, sans-serif', fontSize: 13, lineHeight: 1.5, color: '#6B5400' }}>
          ⏱ Walking in is first-come, first-served. If all 10 courts are full, you may need to wait — reserving online guarantees your slot.
        </div>
      </div>
    </section>
  )
}

export default function ConceptBBookingPage() {
  const [mode, setMode] = useState<Mode>('reserve')
  const isMobile = useIsMobile()

  return (
    <div style={{ background: t.bg, minHeight: '100vh' }}>
      <TopBar />
      <ModeChooser mode={mode} setMode={setMode} />
      {mode === 'walkin'
        ? <WalkinCard />
        : isMobile === null
          ? <div style={{ padding: 40, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.22em', color: t.mute, textAlign: 'center' }}>LOADING…</div>
          : isMobile ? <MobileFlow /> : <DesktopFlow />
      }
    </div>
  )
}
