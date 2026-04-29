'use client'

// In-context feedback widget. Renders only when the user has enrolled at
// /tester (localStorage flag set). Lets approved testers drop pinned
// comments anywhere on a page; the dev sees them at /admin.

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

interface Comment {
  id: string
  route: string
  x_pct: number
  y_pct: number
  viewport_w: number
  viewport_h: number
  scroll_y: number
  message: string
  author: string
  status: 'open' | 'resolved'
  created_at: string
}

type Mode = 'idle' | 'dropping' | 'composing'

const PILL_STYLE: React.CSSProperties = {
  position: 'fixed', bottom: 16, right: 16, zIndex: 9000,
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '10px 14px', background: '#1FD659', color: '#04140A',
  border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
  fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.18em', fontWeight: 700,
  textTransform: 'uppercase',
}

const DROPPING_BANNER: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9001,
  background: '#1FD659', color: '#04140A', padding: '10px 16px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.18em', fontWeight: 700,
  textTransform: 'uppercase', boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
}

export default function FeedbackWidget() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const focusPinId = searchParams?.get('focus_pin')
  const [enabled, setEnabled] = useState(false)
  const [author, setAuthor] = useState('')
  const [mode, setMode] = useState<Mode>('idle')
  const [comments, setComments] = useState<Comment[]>([])
  const [composer, setComposer] = useState<{ x: number; y: number; xPct: number; yPct: number } | null>(null)
  const [draft, setDraft] = useState('')
  const [openCommentId, setOpenCommentId] = useState<string | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)

  // Read enrollment from localStorage
  useEffect(() => {
    try {
      const e = localStorage.getItem('pickball:tester:enabled')
      const n = localStorage.getItem('pickball:tester:name')
      if (e === '1' && n) { setEnabled(true); setAuthor(n) }
    } catch {}
  }, [])

  // Fetch comments for the current route. Pins are visible to anyone past
  // the SITE_PASSWORD gate; only leaving comments requires tester enrollment.
  const refresh = useCallback(async () => {
    if (!pathname) return
    try {
      const res = await fetch(`/api/feedback?route=${encodeURIComponent(pathname)}`)
      if (!res.ok) return
      const data = await res.json()
      setComments(data.comments ?? [])
    } catch {}
  }, [pathname])

  useEffect(() => { refresh() }, [refresh])

  // If admin used "Jump to pin", auto-open it once comments load.
  useEffect(() => {
    if (!focusPinId || comments.length === 0) return
    const target = comments.find(c => c.id === focusPinId)
    if (!target) return
    setOpenCommentId(focusPinId)
    const docHeight = Math.max(document.documentElement.scrollHeight, window.innerHeight)
    window.scrollTo({ top: (target.y_pct / 100) * docHeight - window.innerHeight / 2, behavior: 'smooth' })
  }, [focusPinId, comments])

  // Click handler while in dropping mode — capture coords + open composer
  useEffect(() => {
    if (mode !== 'dropping') return
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      // Ignore clicks inside the widget itself
      if (target?.closest?.('[data-feedback-widget]')) return
      e.preventDefault(); e.stopPropagation()
      const w = window.innerWidth, h = window.innerHeight
      const xPct = (e.clientX / w) * 100
      const yPct = ((e.clientY + window.scrollY) / Math.max(document.documentElement.scrollHeight, h)) * 100
      setComposer({ x: e.clientX, y: e.clientY, xPct, yPct })
      setMode('composing')
      setDraft('')
    }
    document.addEventListener('click', onClick, true)
    document.body.style.cursor = 'crosshair'
    return () => {
      document.removeEventListener('click', onClick, true)
      document.body.style.cursor = ''
    }
  }, [mode])

  // ESC cancels active mode
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (mode === 'dropping') setMode('idle')
      else if (mode === 'composing') { setComposer(null); setMode('idle') }
      else if (openCommentId) setOpenCommentId(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mode, openCommentId])

  async function saveDraft() {
    if (!composer || !draft.trim() || !pathname) return
    setSavingDraft(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route: pathname, x_pct: composer.xPct, y_pct: composer.yPct,
          viewport_w: window.innerWidth, viewport_h: window.innerHeight, scroll_y: window.scrollY,
          message: draft.trim(), author,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setComments(c => [data.comment, ...c])
      }
    } finally {
      setSavingDraft(false)
      setComposer(null); setMode('idle'); setDraft('')
    }
  }

  async function toggleResolved(c: Comment) {
    const next = c.status === 'open' ? 'resolved' : 'open'
    try {
      const res = await fetch(`/api/feedback?id=${c.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (res.ok) {
        const data = await res.json()
        setComments(prev => prev.map(x => x.id === c.id ? data.comment : x))
      }
    } catch {}
  }

  const docHeight = typeof document !== 'undefined' ? Math.max(document.documentElement.scrollHeight, window.innerHeight) : 0

  return (
    <div data-feedback-widget>
      {/* Pins */}
      {comments.map(c => {
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
        const left = (c.x_pct / 100) * vw
        const top = (c.y_pct / 100) * docHeight
        const isOpen = openCommentId === c.id
        const number = comments.findIndex(x => x.id === c.id) + 1
        // Flip popup left when pin is on the right half of the viewport
        // so the 240–300px popup stays on-screen on phones.
        const flip = left > vw / 2
        return (
          <div key={c.id} style={{ position: 'absolute', top: top - 14, left: left - 14, zIndex: 8000, pointerEvents: 'auto' }}>
            <button
              onClick={() => setOpenCommentId(isOpen ? null : c.id)}
              title={`${c.author}: ${c.message}`}
              style={{
                width: 28, height: 28, borderRadius: '50% 50% 50% 0',
                transform: 'rotate(-45deg)',
                background: c.status === 'resolved' ? '#9AA39E' : '#1FD659',
                color: '#04140A', border: '2px solid #04140A',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
                boxShadow: '0 4px 8px rgba(0,0,0,0.35)',
              }}>
              <span style={{ transform: 'rotate(45deg)' }}>{number}</span>
            </button>
            {isOpen && (
              <div onClick={e => e.stopPropagation()} style={{
                position: 'absolute', top: 36,
                ...(flip ? { right: 0 } : { left: 0 }),
                minWidth: 240, maxWidth: 300,
                background: '#0F1411', color: '#fff', border: '1px solid rgba(31,214,89,0.4)',
                padding: '12px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 8001,
                fontFamily: 'Archivo, sans-serif', fontSize: 13, lineHeight: 1.5,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <strong style={{ color: '#1FD659', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', fontWeight: 700 }}>
                    {c.author.toUpperCase()}
                  </strong>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>
                <div style={{ marginBottom: 10, whiteSpace: 'pre-wrap' }}>{c.message}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => toggleResolved(c)} style={{
                    flex: 1, background: c.status === 'open' ? '#1FD659' : 'transparent',
                    color: c.status === 'open' ? '#04140A' : 'rgba(255,255,255,0.7)',
                    border: c.status === 'open' ? 'none' : '1px solid rgba(255,255,255,0.2)',
                    padding: '6px 10px', cursor: 'pointer',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', fontWeight: 700,
                  }}>
                    {c.status === 'open' ? 'RESOLVE ✓' : 'REOPEN'}
                  </button>
                  <button onClick={() => setOpenCommentId(null)} style={{
                    background: 'transparent', color: 'rgba(255,255,255,0.5)',
                    border: '1px solid rgba(255,255,255,0.15)', padding: '6px 10px', cursor: 'pointer',
                    fontSize: 10, letterSpacing: '0.18em', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                  }}>CLOSE</button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Composer balloon — only when enrolled */}
      {enabled && composer && (() => {
        const COMPOSER_W = 280
        const COMPOSER_H = 220 // approx — textarea + buttons
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
        const vh = typeof window !== 'undefined' ? window.innerHeight : 800
        const left = Math.max(8, Math.min(composer.x, vw - COMPOSER_W - 8))
        const top = Math.max(8, Math.min(composer.y, vh - COMPOSER_H - 8))
        return (
        <div style={{
          position: 'fixed', top, left, zIndex: 9002,
          background: '#0F1411', color: '#fff', border: '1.5px solid #1FD659',
          padding: 12, width: COMPOSER_W, boxShadow: '0 12px 32px rgba(0,0,0,0.55)',
        }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', color: '#1FD659', fontWeight: 700, marginBottom: 8 }}>
            ◆ NEW COMMENT — {author.toUpperCase()}
          </div>
          <textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="What's the feedback?"
            rows={4}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#1F2924', color: '#fff', border: '1px solid rgba(255,255,255,0.15)',
              padding: 8, fontFamily: 'Archivo, sans-serif', fontSize: 13, resize: 'vertical', outline: 'none',
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveDraft() }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={saveDraft} disabled={!draft.trim() || savingDraft} style={{
              flex: 1, background: draft.trim() ? '#1FD659' : '#9AA39E', color: '#04140A', border: 'none',
              padding: '8px 12px', cursor: draft.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.18em', fontWeight: 700,
            }}>{savingDraft ? 'SAVING…' : 'PIN IT →'}</button>
            <button onClick={() => { setComposer(null); setMode('idle') }} style={{
              background: 'transparent', color: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.15)', padding: '8px 12px', cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', fontWeight: 700,
            }}>ESC</button>
          </div>
        </div>
        )
      })()}

      {/* Dropping banner — only when enrolled */}
      {enabled && mode === 'dropping' && (
        <div style={DROPPING_BANNER}>
          <span>● TAP ANYWHERE TO DROP A PIN</span>
          <button onClick={() => setMode('idle')} style={{
            background: '#04140A', color: '#fff', border: 'none', padding: '6px 12px',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', fontWeight: 700, cursor: 'pointer',
          }}>CANCEL (ESC)</button>
        </div>
      )}

      {/* Floating pill — only when enrolled */}
      {enabled && mode === 'idle' && (
        <button onClick={() => setMode('dropping')} style={PILL_STYLE} title={`Tester mode — ${author}`}>
          💬 LEAVE A COMMENT
        </button>
      )}
    </div>
  )
}
