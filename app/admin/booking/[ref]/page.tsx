'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import styles from '../../admin.module.css'

type Status = 'locked' | 'confirmed' | 'cancelled' | 'expired'
type PayMode = 'online' | 'onsite_entrance'

type BookingRow = {
  id: string
  reference: string
  court_number: number
  booking_date: string
  start_time: string
  end_time: string
  duration: number
  players: number
  customer_name: string
  customer_phone: string
  customer_email?: string
  payment_method?: string
  payment_reference?: string
  pay_mode: PayMode
  status: Status
  locked_until?: string
  created_at: string
}

type PlayerRow = {
  id: string
  booking_id: string
  full_name: string | null
  checkin_token: string
  checked_in_at: string | null
}

type AuditRow = {
  id: string
  edited_at: string
  edited_by: string | null
  action: 'edit' | 'void'
  notes: string | null
  before: unknown
  after: unknown
}

function fmtTime(t: string) {
  const hr = parseInt(t.split(':')[0])
  if (hr === 0 || hr === 24) return '12:00 AM'
  if (hr < 12) return `${hr}:00 AM`
  if (hr === 12) return '12:00 PM'
  return `${hr - 12}:00 PM`
}

function endOf(start: string, duration: number): string {
  const h = parseInt(start.split(':')[0]) + duration
  return `${String(h).padStart(2, '0')}:00`
}

const HOURS = Array.from({ length: 16 }, (_, i) => 8 + i) // 08..23

export default function AdminBookingPage({
  params,
}: {
  params: Promise<{ ref: string }>
}) {
  const { ref } = use(params)

  const [key, setKey] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [pwInput, setPwInput] = useState('')

  const [rows, setRows] = useState<BookingRow[]>([])
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [audit, setAudit] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const [okMsg, setOkMsg] = useState('')
  const [editedBy, setEditedBy] = useState('')
  const [notes, setNotes] = useState('')

  // Try sessionStorage key first; fall back to password prompt.
  useEffect(() => {
    const stored = sessionStorage.getItem('admin_key') || ''
    if (stored) {
      setKey(stored)
      setAuthed(true)
    }
    setEditedBy(localStorage.getItem('admin_edited_by') || '')
  }, [])

  const fetchData = useCallback(async (k: string) => {
    setLoading(true)
    setErrMsg('')
    try {
      const res = await fetch(
        `/api/admin/booking/${encodeURIComponent(ref)}?key=${encodeURIComponent(k)}`
      )
      if (res.status === 401) {
        setAuthed(false)
        sessionStorage.removeItem('admin_key')
        setErrMsg('Invalid admin password.')
        return
      }
      if (res.status === 404) {
        setErrMsg(`No booking found for reference "${ref}".`)
        setRows([])
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrMsg(data.error || `HTTP ${res.status}`)
        return
      }
      const data = await res.json()
      setRows(data.rows || [])
      setPlayers(data.players || [])
      setAudit(data.audit || [])
    } finally {
      setLoading(false)
    }
  }, [ref])

  useEffect(() => {
    if (authed && key) fetchData(key)
  }, [authed, key, fetchData])

  async function handleLogin() {
    setAuthError('')
    const res = await fetch(
      `/api/admin/booking/${encodeURIComponent(ref)}?key=${encodeURIComponent(pwInput)}`
    )
    if (res.status === 401) {
      setAuthError('Invalid password')
      return
    }
    sessionStorage.setItem('admin_key', pwInput)
    setKey(pwInput)
    setAuthed(true)
  }

  function rememberEditedBy(v: string) {
    setEditedBy(v)
    localStorage.setItem('admin_edited_by', v)
  }

  async function patchBooking(payload: Record<string, unknown>) {
    setErrMsg('')
    setOkMsg('')
    const body = { key, edited_by: editedBy || null, notes: notes || null, ...payload }
    const res = await fetch(`/api/admin/booking/${encodeURIComponent(ref)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (res.status === 409 && data.conflict) {
        const c = data.conflict
        setErrMsg(
          `Conflict — Court ${c.court_number} at ${fmtTime(c.start_time)} is already taken by booking ${c.reference}.`
        )
      } else {
        setErrMsg(data.error || `HTTP ${res.status}`)
      }
      return false
    }
    setOkMsg(data.email_warning ? `Saved — but email failed: ${data.email_warning}` : 'Saved.')
    setNotes('')
    await fetchData(key)
    return true
  }

  async function voidBooking() {
    if (!confirm(`Void booking ${ref}? This cancels every row under this reference.`)) return
    setErrMsg('')
    setOkMsg('')
    const res = await fetch(`/api/admin/booking/${encodeURIComponent(ref)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, edited_by: editedBy || null, notes: notes || null }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setErrMsg(data.error || `HTTP ${res.status}`)
      return
    }
    setOkMsg('Booking voided.')
    setNotes('')
    fetchData(key)
  }

  if (!authed) {
    return (
      <div className={styles.loginPage}>
        <div className={styles.loginCard}>
          <div className={styles.loginTitle}>Admin Access</div>
          <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 16 }}>
            Editing booking <strong style={{ color: '#fff' }}>{ref}</strong>
          </div>
          <input
            className="field-input"
            type="password"
            placeholder="Enter admin password"
            value={pwInput}
            onChange={e => setPwInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          {authError && <div className={styles.error}>{authError}</div>}
          <button
            className="btn-primary"
            style={{ width: '100%', clipPath: 'none', marginTop: 12 }}
            onClick={handleLogin}
          >
            Login
          </button>
          <Link
            href="/admin"
            style={{ display: 'block', marginTop: 16, textAlign: 'center', color: '#6b7280', fontSize: 12 }}
          >
            ← Back to admin
          </Link>
        </div>
      </div>
    )
  }

  const head = rows[0]
  const overallStatus: Status = head?.status || 'expired'

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <Link href="/admin" style={{ color: '#6b7280', fontSize: 12, textDecoration: 'none' }}>
            ← Back to admin
          </Link>
          <div className={styles.title} style={{ marginTop: 6 }}>
            Edit Booking
          </div>
        </div>
        <div className={styles.headerRight}>
          {head && (
            <span
              className={`${styles.statusBadge} ${styles[`status_${overallStatus}`]}`}
              style={{ alignSelf: 'center' }}
            >
              {overallStatus.toUpperCase()}
            </span>
          )}
          <button className={styles.refreshBtn} onClick={() => fetchData(key)}>↻ Refresh</button>
        </div>
      </div>

      {loading && <div className={styles.empty}>Loading…</div>}

      {!loading && rows.length === 0 && (
        <div className={styles.empty}>{errMsg || 'No rows.'}</div>
      )}

      {!loading && rows.length > 0 && head && (
        <>
          <div className={styles.ref} style={{ fontSize: 28, marginBottom: 8 }}>{head.reference}</div>
          <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 24 }}>
            {rows.length} {rows.length === 1 ? 'slot' : 'slots'} · {players.length} {players.length === 1 ? 'player' : 'players'}
          </div>

          {errMsg && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171', padding: 12, marginBottom: 16, fontSize: 13 }}>
              {errMsg}
            </div>
          )}
          {okMsg && (
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.35)', color: '#22c55e', padding: 12, marginBottom: 16, fontSize: 13 }}>
              {okMsg}
            </div>
          )}

          {/* Audit metadata */}
          <div className={styles.card} style={{ marginBottom: 16 }}>
            <div className={styles.fieldLabel}>Audit metadata (applies to next save)</div>
            <div className={styles.metaGrid} style={{ marginTop: 12 }}>
              <input
                className="field-input"
                placeholder="Your name (auto-saved)"
                value={editedBy}
                onChange={e => rememberEditedBy(e.target.value)}
              />
              <input
                className="field-input"
                placeholder="Notes (e.g. customer called, moved due to power outage)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          <CustomerCard head={head} onSave={patchBooking} />

          {rows.map(row => (
            <SlotCard key={row.id} row={row} onSave={patchBooking} />
          ))}

          {/* Players */}
          {players.length > 0 && (
            <div className={styles.card} style={{ marginBottom: 16 }}>
              <div className={styles.cardTop}>
                <div className={styles.fieldLabel} style={{ marginBottom: 0 }}>Players · check-in</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {players.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                    <span style={{ color: '#fff' }}>{p.full_name || '— (not provided)'}</span>
                    <span style={{ color: p.checked_in_at ? '#22c55e' : '#6b7280', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                      {p.checked_in_at ? `✓ checked in ${new Date(p.checked_in_at).toLocaleString()}` : 'not checked in'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Void */}
          {overallStatus !== 'cancelled' && (
            <div className={styles.card} style={{ marginBottom: 16, borderColor: 'rgba(239,68,68,0.25)' }}>
              <div className={styles.fieldLabel} style={{ color: '#f87171' }}>Danger zone</div>
              <p style={{ color: '#9ca3af', fontSize: 13, margin: '8px 0 12px' }}>
                Void cancels every slot under this reference. Customer gets no auto email — coordinate refund manually.
              </p>
              <button className={styles.rejectBtn} onClick={voidBooking}>✕ Void Booking</button>
            </div>
          )}

          {/* Audit log */}
          {audit.length > 0 && (
            <details className={styles.card} style={{ marginBottom: 16 }}>
              <summary style={{ cursor: 'pointer', listStyle: 'none', color: '#9ca3af', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>
                Audit log ({audit.length})
              </summary>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {audit.map(a => (
                  <div key={a.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', marginBottom: 4 }}>
                      <span>
                        <strong style={{ color: a.action === 'void' ? '#f87171' : '#22c55e' }}>{a.action.toUpperCase()}</strong>
                        {a.edited_by ? ` by ${a.edited_by}` : ' (no name)'}
                      </span>
                      <span>{new Date(a.edited_at).toLocaleString()}</span>
                    </div>
                    {a.notes && <div style={{ color: '#fff', marginBottom: 4 }}>{a.notes}</div>}
                    <pre style={{ fontSize: 11, color: '#6b7280', background: '#0a0a0a', padding: 8, overflow: 'auto', maxHeight: 160, margin: 0 }}>
                      {JSON.stringify(a.after, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  )
}

// ── Customer card ──────────────────────────────────────────────────────────
function CustomerCard({
  head,
  onSave,
}: {
  head: BookingRow
  onSave: (payload: Record<string, unknown>) => Promise<boolean>
}) {
  const [name, setName] = useState(head.customer_name)
  const [phone, setPhone] = useState(head.customer_phone)
  const [email, setEmail] = useState(head.customer_email || '')
  const [players, setPlayers] = useState(head.players)
  const [payMode, setPayMode] = useState<PayMode>(head.pay_mode)
  const [saving, setSaving] = useState(false)

  // Reset when underlying data refreshes (after a save).
  useEffect(() => {
    setName(head.customer_name)
    setPhone(head.customer_phone)
    setEmail(head.customer_email || '')
    setPlayers(head.players)
    setPayMode(head.pay_mode)
  }, [head.customer_name, head.customer_phone, head.customer_email, head.players, head.pay_mode])

  const dirty =
    name !== head.customer_name ||
    phone !== head.customer_phone ||
    email !== (head.customer_email || '') ||
    players !== head.players ||
    payMode !== head.pay_mode

  async function save() {
    setSaving(true)
    await onSave({
      customer_name: name,
      customer_phone: phone,
      customer_email: email || null,
      players,
      pay_mode: payMode,
    })
    setSaving(false)
  }

  return (
    <div className={styles.card} style={{ marginBottom: 16 }}>
      <div className={styles.fieldLabel}>Customer (applies to all slots)</div>
      <div className={styles.formGrid2} style={{ marginTop: 12 }}>
        <label style={{ fontSize: 11, color: '#6b7280' }}>
          Name
          <input className="field-input" value={name} onChange={e => setName(e.target.value)} style={{ marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 11, color: '#6b7280' }}>
          Phone
          <input className="field-input" value={phone} onChange={e => setPhone(e.target.value)} style={{ marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 11, color: '#6b7280' }}>
          Email
          <input className="field-input" value={email} onChange={e => setEmail(e.target.value)} style={{ marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 11, color: '#6b7280' }}>
          Players
          <input
            type="number"
            min={1}
            max={20}
            className="field-input"
            value={players}
            onChange={e => setPlayers(parseInt(e.target.value) || 1)}
            style={{ marginTop: 4 }}
          />
        </label>
        <label style={{ fontSize: 11, color: '#6b7280' }}>
          Pay mode
          <select
            className="field-input"
            value={payMode}
            onChange={e => setPayMode(e.target.value as PayMode)}
            style={{ marginTop: 4, width: '100%' }}
          >
            <option value="online">Online (court + entrance)</option>
            <option value="onsite_entrance">Onsite entrance (cash at desk)</option>
          </select>
        </label>
      </div>
      <div className={styles.actions} style={{ marginTop: 16 }}>
        <button
          className={styles.approveBtn}
          disabled={!dirty || saving}
          onClick={save}
        >
          {saving ? 'Saving…' : dirty ? 'Save customer' : 'No changes'}
        </button>
      </div>
    </div>
  )
}

// ── Slot card ──────────────────────────────────────────────────────────────
function SlotCard({
  row,
  onSave,
}: {
  row: BookingRow
  onSave: (payload: Record<string, unknown>) => Promise<boolean>
}) {
  const [court, setCourt] = useState(row.court_number)
  const [date, setDate] = useState(row.booking_date)
  const [start, setStart] = useState(row.start_time)
  const [duration, setDuration] = useState(row.duration)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setCourt(row.court_number)
    setDate(row.booking_date)
    setStart(row.start_time)
    setDuration(row.duration)
  }, [row.court_number, row.booking_date, row.start_time, row.duration])

  const dirty =
    court !== row.court_number ||
    date !== row.booking_date ||
    start !== row.start_time ||
    duration !== row.duration

  async function save() {
    setSaving(true)
    await onSave({
      rows: [{ id: row.id, court_number: court, booking_date: date, start_time: start, duration }],
    })
    setSaving(false)
  }

  const startHour = parseInt(start.split(':')[0])
  const endHour = startHour + duration

  return (
    <div className={`${styles.card} ${styles[`card_${row.status}`]}`} style={{ marginBottom: 16 }}>
      <div className={styles.cardTop}>
        <div className={styles.ref} style={{ fontSize: 18 }}>SO{row.court_number} · {row.booking_date} · {fmtTime(row.start_time)}–{fmtTime(row.end_time)}</div>
        <span className={`${styles.statusBadge} ${styles[`status_${row.status}`]}`}>{row.status.toUpperCase()}</span>
      </div>

      <div className={styles.formGrid4}>
        <label style={{ fontSize: 11, color: '#6b7280' }}>
          Court (1–10)
          <input
            type="number"
            min={1}
            max={10}
            className="field-input"
            value={court}
            onChange={e => setCourt(parseInt(e.target.value) || 1)}
            style={{ marginTop: 4 }}
          />
        </label>
        <label style={{ fontSize: 11, color: '#6b7280' }}>
          Date
          <input
            type="date"
            className="field-input"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ marginTop: 4 }}
          />
        </label>
        <label style={{ fontSize: 11, color: '#6b7280' }}>
          Start
          <select
            className="field-input"
            value={start}
            onChange={e => setStart(e.target.value)}
            style={{ marginTop: 4, width: '100%' }}
          >
            {HOURS.map(h => (
              <option key={h} value={`${String(h).padStart(2, '0')}:00`}>
                {fmtTime(`${h}:00`)}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: 11, color: '#6b7280' }}>
          Duration (hrs, max {24 - startHour})
          <input
            type="number"
            min={1}
            max={24 - startHour}
            className="field-input"
            value={duration}
            onChange={e => setDuration(parseInt(e.target.value) || 1)}
            style={{ marginTop: 4 }}
          />
        </label>
      </div>

      {endHour > 24 && (
        <div style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>
          End time {endHour}:00 exceeds operating hours (closes at 12 AM).
        </div>
      )}

      <div className={styles.actions} style={{ marginTop: 16 }}>
        <button
          className={styles.approveBtn}
          disabled={!dirty || saving || endHour > 24}
          onClick={save}
        >
          {saving ? 'Saving…' : dirty ? 'Save slot' : 'No changes'}
        </button>
      </div>

      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 12 }}>
        New end time: {fmtTime(endOf(start, duration))} · ID: <code>{row.id.slice(0, 8)}</code>
      </div>
    </div>
  )
}
