'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { COURT_PRICE_PER_HOUR, ENTRANCE_FEE_PER_PERSON } from '@/lib/types'
import { getSupabase } from '@/lib/supabase'

interface LockedBooking {
  id: string
  reference: string
  court_number: number
  booking_date: string
  start_time: string
  duration: number
  players: number
  customer_name: string
  locked_until: string | null
}

interface AttemptLog {
  ts: string
  payload: { amount: number; reference: string; provider: string; sender_name?: string }
  result: string
  detail: string
}

function totalFor(rows: LockedBooking[]): number {
  if (rows.length === 0) return 0
  const courts = rows.length
  const hours = rows[0].duration
  const players = rows[0].players
  return courts * hours * COURT_PRICE_PER_HOUR + players * ENTRANCE_FEE_PER_PERSON
}

export default function PaymentDemoPage() {
  const [locked, setLocked] = useState<LockedBooking[]>([])
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState<string>('')
  const [reference, setReference] = useState('GC-DEMO-' + Math.random().toString(36).slice(2, 9).toUpperCase())
  const [senderName, setSenderName] = useState('Juan dela Cruz')
  const [provider, setProvider] = useState<'gcash' | 'maya' | 'gotyme'>('gcash')
  const [log, setLog] = useState<AttemptLog[]>([])
  const [submitting, setSubmitting] = useState(false)

  const fetchLocked = useCallback(async () => {
    setLoading(true)
    const { data } = await getSupabase()
      .from('bookings')
      .select('id,reference,court_number,booking_date,start_time,duration,players,customer_name,locked_until')
      .eq('status', 'locked')
      .order('locked_until', { ascending: true })
    const now = new Date()
    const active = (data || []).filter(b => b.locked_until && new Date(b.locked_until) > now)
    setLocked(active)
    setLoading(false)
  }, [])

  useEffect(() => { fetchLocked() }, [fetchLocked])

  // Realtime: re-fetch when any booking changes status.
  useEffect(() => {
    const supabase = getSupabase()
    const ch = supabase
      .channel('bookings:demo')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => { fetchLocked() }
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchLocked])

  // Group locked rows by reference
  const grouped = (() => {
    const m = new Map<string, LockedBooking[]>()
    for (const b of locked) {
      const list = m.get(b.reference) ?? []
      list.push(b)
      m.set(b.reference, list)
    }
    return Array.from(m.entries()).map(([ref, rows]) => ({
      reference: ref,
      rows,
      total: totalFor(rows),
    }))
  })()

  const submit = async () => {
    setSubmitting(true)
    const payload = {
      amount: parseFloat(amount || '0'),
      reference,
      sender_name: senderName,
      provider,
      received_at: new Date().toISOString(),
    }
    try {
      const res = await fetch('/api/payment-confirmed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      const detail = data.result === 'confirmed'
        ? `✓ ${data.reference} — ${data.customer_name} — courts ${data.courts.join(',')}`
        : data.reason || data.error || JSON.stringify(data)
      setLog(l => [{
        ts: new Date().toLocaleTimeString(),
        payload,
        result: data.result || (res.ok ? 'ok' : 'error'),
        detail,
      }, ...l].slice(0, 20))
      // Cycle reference for next demo
      setReference('GC-DEMO-' + Math.random().toString(36).slice(2, 9).toUpperCase())
      fetchLocked()
    } finally {
      setSubmitting(false)
    }
  }

  // One-tap: pre-fill the form with the matching amount for a locked booking
  const fillFor = (g: { reference: string; total: number }) => {
    setAmount(String(g.total))
  }

  return (
    <div style={{
      maxWidth: 1100, margin: '0 auto', padding: '32px 20px 80px',
      fontFamily: 'var(--font-barlow-condensed), sans-serif', color: '#fff',
      minHeight: '100vh', background: '#0a0a0a',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <Link href="/admin" style={{ color: '#9ca3af', textDecoration: 'underline', fontSize: 13 }}>← /admin</Link>
        <span style={{ fontSize: 11, letterSpacing: 2, color: '#fbbf24' }}>DEMO MODE — fakes a parsed payment email</span>
      </div>
      <h1 style={{ fontSize: 32, letterSpacing: 1, marginBottom: 4 }}>PAYMENT AUTO-CONFIRM</h1>
      <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 32, maxWidth: 700, lineHeight: 1.5 }}>
        Simulate the moment a payment-confirmation email lands in our mailbox.
        Fill in the amount + reference + provider, hit submit. The matcher finds
        a locked booking with that exact total (±₱{5}) and auto-confirms it.
        Watch a connected /booking page flip from locked → confirmed in realtime.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        {/* LEFT — form */}
        <section>
          <h2 style={{ fontSize: 14, letterSpacing: 2, color: '#22c55e', marginBottom: 16 }}>
            01 — FAKE INBOUND EMAIL
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label={`Amount (₱)`}>
              <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 2300" style={inputStyle} />
            </Field>
            <Field label="Provider">
              <select value={provider} onChange={e => setProvider(e.target.value as 'gcash' | 'maya' | 'gotyme')} style={inputStyle}>
                <option value="gcash">GCash</option>
                <option value="maya">Maya</option>
                <option value="gotyme">GoTyme</option>
              </select>
            </Field>
            <Field label="Payment Reference (from GCash/Maya/GoTyme)">
              <input value={reference} onChange={e => setReference(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Sender Name (parsed from email)">
              <input value={senderName} onChange={e => setSenderName(e.target.value)} style={inputStyle} />
            </Field>
            <button type="button" disabled={submitting || !amount} onClick={submit}
              style={{
                marginTop: 8, padding: '14px 22px',
                background: submitting ? '#374151' : '#22c55e', color: '#000',
                border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                letterSpacing: 1.5, cursor: submitting ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase',
              }}>
              {submitting ? 'Sending…' : '▶ Fire Fake Email'}
            </button>
          </div>

          {log.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <h2 style={{ fontSize: 14, letterSpacing: 2, color: '#22c55e', marginBottom: 12 }}>
                03 — RESULT LOG (most recent first)
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {log.map((entry, i) => {
                  const isOk = entry.result === 'confirmed'
                  const isAmbig = entry.result === 'ambiguous'
                  const color = isOk ? '#22c55e' : isAmbig ? '#fbbf24' : '#f87171'
                  return (
                    <div key={i} style={{
                      padding: '10px 12px', background: '#161616', border: `1px solid ${color}40`,
                      fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                    }}>
                      <div style={{ color, fontWeight: 700, marginBottom: 4 }}>
                        [{entry.ts}] {entry.result.toUpperCase()}
                      </div>
                      <div style={{ color: '#d1d5db' }}>
                        ₱{entry.payload.amount.toLocaleString()} · {entry.payload.provider} · {entry.payload.reference}
                      </div>
                      <div style={{ color: '#9ca3af', marginTop: 4 }}>{entry.detail}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        {/* RIGHT — locked bookings */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, letterSpacing: 2, color: '#22c55e', margin: 0 }}>
              02 — CURRENTLY LOCKED ({grouped.length})
            </h2>
            <button type="button" onClick={fetchLocked}
              style={{
                background: 'transparent', border: '1px solid #374151', color: '#9ca3af',
                padding: '4px 10px', fontSize: 11, letterSpacing: 1, cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
              {loading ? '...' : '↻ REFRESH'}
            </button>
          </div>

          {grouped.length === 0 && (
            <div style={{ padding: 20, background: '#161616', border: '1px dashed #374151', color: '#9ca3af', fontSize: 13 }}>
              No active locked bookings. Open <code style={{ color: '#22c55e' }}>/booking</code>, lock a slot,
              come back here and fire the matching amount.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {grouped.map(g => {
              const expiresIn = Math.max(0, Math.round((new Date(g.rows[0].locked_until!).getTime() - Date.now()) / 1000))
              const courts = g.rows.map(r => `SO${r.court_number}`).join(', ')
              return (
                <div key={g.reference} style={{
                  padding: '14px 16px', background: '#161616', border: '1px solid #22c55e40',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#22c55e' }}>{g.reference}</div>
                    <div style={{ fontSize: 12, color: '#d1d5db', marginTop: 2 }}>
                      {courts} · {g.rows[0].booking_date} · {g.rows[0].start_time} · {g.rows[0].duration}h · {g.rows[0].players}p
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                      {g.rows[0].customer_name} · expires in {expiresIn}s
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>₱{g.total.toLocaleString()}</div>
                    <button type="button" onClick={() => fillFor(g)}
                      style={{
                        marginTop: 6, background: 'transparent', border: '1px solid #22c55e',
                        color: '#22c55e', padding: '4px 10px', fontSize: 10, letterSpacing: 1,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                      USE THIS AMOUNT →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: '#161616',
  border: '1px solid #374151', color: '#fff', fontFamily: 'inherit',
  fontSize: 14, outline: 'none',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, letterSpacing: 1.5, color: '#9ca3af', textTransform: 'uppercase' }}>
        {label}
      </span>
      {children}
    </label>
  )
}
