'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './admin.module.css'

interface Booking {
  id: string
  reference: string
  court_number: number
  booking_date: string
  start_time: string
  end_time: string
  duration: number
  customer_name: string
  customer_phone: string
  customer_email?: string
  payment_method?: string
  payment_reference?: string
  status: 'locked' | 'confirmed' | 'cancelled' | 'expired'
  locked_until?: string
  created_at: string
}

type Tab = 'pending' | 'confirmed' | 'all'

function formatTime(t: string) {
  const hr = parseInt(t.split(':')[0])
  if (hr === 0) return '12:00 AM'
  if (hr < 12) return `${hr}:00 AM`
  if (hr === 12) return '12:00 PM'
  return `${hr - 12}:00 PM`
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [key, setKey] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('pending')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchBookings = useCallback(async (k: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/bookings?key=${encodeURIComponent(k)}`)
      if (!res.ok) { setAuthed(false); setAuthError('Invalid password'); return }
      const data = await res.json()
      setBookings(data.bookings || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authed) return
    fetchBookings(key)
    const interval = setInterval(() => fetchBookings(key), 30000)
    return () => clearInterval(interval)
  }, [authed, key, fetchBookings])

  async function handleLogin() {
    setAuthError('')
    const res = await fetch(`/api/admin/bookings?key=${encodeURIComponent(password)}`)
    if (res.ok) { setKey(password); setAuthed(true) }
    else setAuthError('Invalid password')
  }

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setActionLoading(id + action)
    try {
      await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, key }),
      })
      fetchBookings(key)
    } finally {
      setActionLoading(null)
    }
  }

  const pending = bookings.filter(b => b.status === 'locked')
  const filtered = tab === 'pending' ? pending
    : tab === 'confirmed' ? bookings.filter(b => b.status === 'confirmed')
    : bookings

  if (!authed) {
    return (
      <div className={styles.loginPage}>
        <div className={styles.loginCard}>
          <div className={styles.loginTitle}>Admin Access</div>
          <input
            className="field-input"
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          {authError && <div className={styles.error}>{authError}</div>}
          <button className="btn-primary" style={{ width: '100%', clipPath: 'none', marginTop: 12 }} onClick={handleLogin}>
            Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.title}>Bookings Dashboard</div>
        <div className={styles.headerRight}>
          <button className={styles.refreshBtn} onClick={() => fetchBookings(key)}>↻ Refresh</button>
          <button className={styles.logoutBtn} onClick={() => { setAuthed(false); setKey('') }}>Logout</button>
        </div>
      </div>

      <div className={styles.tabs}>
        {(['pending', 'confirmed', 'all'] as Tab[]).map(t => (
          <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'pending' && pending.length > 0 && <span className={styles.badge}>{pending.length}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.empty}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>{tab === 'pending' ? 'No pending bookings — all clear.' : 'No bookings found.'}</div>
      ) : (
        <div className={styles.list}>
          {filtered.map(b => (
            <div key={b.id} className={`${styles.card} ${styles[`card_${b.status}`]}`}>
              <div className={styles.cardTop}>
                <div className={styles.ref}>{b.reference}</div>
                <span className={`${styles.statusBadge} ${styles[`status_${b.status}`]}`}>{b.status.toUpperCase()}</span>
              </div>

              <div className={styles.cardGrid}>
                <div className={styles.field}><div className={styles.fieldLabel}>Court</div><div className={styles.fieldVal}>Court {b.court_number}</div></div>
                <div className={styles.field}><div className={styles.fieldLabel}>Date</div><div className={styles.fieldVal}>{b.booking_date}</div></div>
                <div className={styles.field}><div className={styles.fieldLabel}>Time</div><div className={styles.fieldVal}>{formatTime(b.start_time)} – {formatTime(b.end_time)}</div></div>
                <div className={styles.field}><div className={styles.fieldLabel}>Duration</div><div className={styles.fieldVal}>{b.duration}h</div></div>
                <div className={styles.field}><div className={styles.fieldLabel}>Customer</div><div className={styles.fieldVal}>{b.customer_name}</div></div>
                <div className={styles.field}><div className={styles.fieldLabel}>Phone</div><div className={styles.fieldVal}>{b.customer_phone}</div></div>
                <div className={styles.field}><div className={styles.fieldLabel}>Payment</div><div className={styles.fieldVal}>{b.payment_method?.toUpperCase() || '—'}</div></div>
                <div className={styles.field}><div className={styles.fieldLabel}>Ref #</div><div className={`${styles.fieldVal} ${styles.refNum}`}>{b.payment_reference || '—'}</div></div>
              </div>

              {b.status === 'locked' && b.payment_reference && (
                <div className={styles.actions}>
                  <button className={styles.approveBtn} disabled={!!actionLoading} onClick={() => handleAction(b.id, 'approve')}>
                    {actionLoading === b.id + 'approve' ? 'Approving…' : '✓ Approve'}
                  </button>
                  <button className={styles.rejectBtn} disabled={!!actionLoading} onClick={() => handleAction(b.id, 'reject')}>
                    {actionLoading === b.id + 'reject' ? 'Rejecting…' : '✕ Reject'}
                  </button>
                </div>
              )}

              {b.status === 'locked' && b.locked_until && (
                <div className={styles.expiresNote}>Hold expires: {new Date(b.locked_until).toLocaleTimeString()}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
