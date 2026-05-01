'use client'

// Tester enrollment. Once a name + key are saved to localStorage, the
// FeedbackWidget mounts site-wide and lets the tester drop pinned comments.

import { useEffect, useState } from 'react'
import Link from 'next/link'

const TESTERS = ['Kyle', 'Yanie', 'Owner', 'Sol Arch', 'Other'] as const
type Tester = typeof TESTERS[number]

export default function TesterPage() {
  const [name, setName] = useState<Tester>('Kyle')
  const [otherName, setOtherName] = useState('')
  const [key, setKey] = useState('')
  const [enrolled, setEnrolled] = useState<{ name: string } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      const enabled = localStorage.getItem('pickball:tester:enabled')
      const who = localStorage.getItem('pickball:tester:name')
      if (enabled === '1' && who) setEnrolled({ name: who })
    } catch {}
  }, [])

  function enroll(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const expected = process.env.NEXT_PUBLIC_TESTER_KEY
    if (!expected) { setError('Tester mode is not configured.'); return }
    if (key.trim() !== expected) { setError('Wrong key. Ask the dev.'); return }
    const finalName = name === 'Other' ? otherName.trim() : name
    if (!finalName) { setError('Pick or type your name.'); return }
    try {
      localStorage.setItem('pickball:tester:enabled', '1')
      localStorage.setItem('pickball:tester:name', finalName)
    } catch { setError('Could not save.'); return }
    setEnrolled({ name: finalName })
  }

  function leave() {
    try {
      localStorage.removeItem('pickball:tester:enabled')
      localStorage.removeItem('pickball:tester:name')
    } catch {}
    setEnrolled(null)
    setKey('')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark)', color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 480, width: '100%', background: 'var(--dark2)', border: '1px solid rgba(34,197,94,0.25)', padding: '32px 28px' }}>
        <div style={{ fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--green)', fontWeight: 600 }}>— Tester Mode</div>
        <h1 style={{ fontFamily: 'var(--font-barlow-condensed), sans-serif', fontWeight: 900, fontSize: 36, textTransform: 'uppercase', lineHeight: 1, margin: '8px 0 6px' }}>
          {enrolled ? `Hi, ${enrolled.name}.` : 'Sign in to comment'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55, margin: '0 0 20px' }}>
          {enrolled
            ? 'Tester mode is on. A "💬 Leave a comment" pill is now visible on every page. Drop pins anywhere to give feedback.'
            : 'Enter the tester key and pick your name. Once enrolled, you can drop pinned comments anywhere on the site.'}
        </p>

        {!enrolled ? (
          <form onSubmit={enroll} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="field-label" style={{ display: 'block', marginBottom: 6 }}>Your name</label>
              <select className="field-input" value={name} onChange={e => setName(e.target.value as Tester)} style={{ width: '100%' }}>
                {TESTERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {name === 'Other' && (
                <input className="field-input" value={otherName} onChange={e => setOtherName(e.target.value)} placeholder="Type your name"
                  style={{ width: '100%', marginTop: 8 }} />
              )}
            </div>
            <div>
              <label className="field-label" style={{ display: 'block', marginBottom: 6 }}>Tester key</label>
              <input className="field-input" type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="Ask the dev" style={{ width: '100%' }} />
            </div>
            {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '8px 12px', fontSize: 13 }}>{error}</div>}
            <button type="submit" className="btn-primary" style={{ clipPath: 'none', marginTop: 4 }}>Enable Tester Mode →</button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link href="/" className="btn-primary" style={{ clipPath: 'none', textAlign: 'center' }}>Go to homepage</Link>
            <Link href="/booking" className="btn-outline" style={{ clipPath: 'none', textAlign: 'center' }}>Go to /booking</Link>
            <button onClick={leave} className="btn-outline" style={{ clipPath: 'none', marginTop: 6, color: 'var(--text-muted)' }}>Exit tester mode</button>
          </div>
        )}
      </div>
    </div>
  )
}
