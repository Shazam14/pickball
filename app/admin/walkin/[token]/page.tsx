'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import adminStyles from '../../admin.module.css'
import styles from './redeem.module.css'
import { WALKIN_COUPON_PHP } from '@/lib/walkin-config'

type Ticket = {
  id: string
  token: string
  ticket_index: number
  coupon_redeemed_at: string | null
  redeemed_by: string | null
  walkin_id: string
}

type Walkin = {
  id: string
  reference: string
  party_size: number
  paid_amount_php: number
  created_at: string
  created_by: string | null
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export default function RedeemPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)

  const [key, setKey] = useState('')
  const [authed, setAuthed] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [authError, setAuthError] = useState('')

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [walkin, setWalkin] = useState<Walkin | null>(null)
  const [loading, setLoading] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const [redeemedBy, setRedeemedBy] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('admin_key') || ''
    if (stored) {
      setKey(stored)
      setAuthed(true)
    }
    setRedeemedBy(localStorage.getItem('admin_edited_by') || '')
  }, [])

  const fetchTicket = useCallback(async (k: string) => {
    setLoading(true)
    setErrMsg('')
    try {
      const res = await fetch(
        `/api/admin/walkin/${encodeURIComponent(token)}?key=${encodeURIComponent(k)}`
      )
      if (res.status === 401) {
        setAuthed(false)
        sessionStorage.removeItem('admin_key')
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrMsg(data.error || `HTTP ${res.status}`)
        return
      }
      setTicket(data.ticket)
      setWalkin(data.walkin)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (authed && key) fetchTicket(key)
  }, [authed, key, fetchTicket])

  async function handleLogin() {
    setAuthError('')
    const res = await fetch(
      `/api/admin/walkin/${encodeURIComponent(token)}?key=${encodeURIComponent(pwInput)}`
    )
    if (res.status === 401) {
      setAuthError('Invalid password')
      return
    }
    sessionStorage.setItem('admin_key', pwInput)
    setKey(pwInput)
    setAuthed(true)
  }

  function rememberRedeemedBy(v: string) {
    setRedeemedBy(v)
    localStorage.setItem('admin_edited_by', v)
  }

  async function handleRedeem() {
    if (!ticket) return
    setSubmitting(true)
    setErrMsg('')
    try {
      const res = await fetch(
        `/api/admin/walkin/${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, redeemed_by: redeemedBy || null }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrMsg(data.error || `HTTP ${res.status}`)
        await fetchTicket(key)
        return
      }
      await fetchTicket(key)
    } finally {
      setSubmitting(false)
    }
  }

  if (!authed) {
    return (
      <div className={adminStyles.loginPage}>
        <div className={adminStyles.loginCard}>
          <h1 className={adminStyles.loginTitle}>Admin Access</h1>
          {authError && <div className={styles.errLine}>{authError}</div>}
          <input
            className={styles.byInput}
            type="password"
            placeholder="Password"
            value={pwInput}
            onChange={e => setPwInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <button className={styles.redeemBtn} onClick={handleLogin}>Sign In</button>
        </div>
      </div>
    )
  }

  return (
    <div className={adminStyles.page}>
      <div className={adminStyles.header}>
        <h1 className={adminStyles.title}>Walk-in Coupon</h1>
        <div className={adminStyles.headerRight}>
          <Link className={adminStyles.refreshBtn} href="/admin">← Dashboard</Link>
        </div>
      </div>

      {loading && !ticket && <div className={styles.card}>Loading…</div>}

      {errMsg && !ticket && (
        <div className={styles.card}>
          <div className={styles.errLine}>{errMsg}</div>
        </div>
      )}

      {ticket && walkin && (
        <div className={styles.card}>
          <div className={styles.refLine}>{walkin.reference}</div>
          <div className={styles.indexLine}>
            Ticket {ticket.ticket_index} of {walkin.party_size}
          </div>

          {ticket.coupon_redeemed_at ? (
            <div className={styles.statusUsed}>
              ✗ Already Redeemed
              <div className={styles.usedDetail}>
                {fmtTime(ticket.coupon_redeemed_at)}
                {ticket.redeemed_by ? ` · by ${ticket.redeemed_by}` : ''}
              </div>
            </div>
          ) : (
            <>
              <div className={styles.statusUnused}>
                ₱{WALKIN_COUPON_PHP} Coupon · Unused
              </div>
              <label className={styles.byLabel}>Redeemed by (optional)</label>
              <input
                className={styles.byInput}
                type="text"
                placeholder="Your name"
                value={redeemedBy}
                onChange={e => rememberRedeemedBy(e.target.value)}
              />
              {errMsg && <div className={styles.errLine}>{errMsg}</div>}
              <button
                className={styles.redeemBtn}
                onClick={handleRedeem}
                disabled={submitting}
              >
                {submitting ? 'Redeeming…' : `Redeem ₱${WALKIN_COUPON_PHP}`}
              </button>
            </>
          )}

          <div className={styles.metaRow}>
            <span>Issued {fmtTime(walkin.created_at)}</span>
            <span>{walkin.created_by ? `by ${walkin.created_by}` : ''}</span>
          </div>
        </div>
      )}
    </div>
  )
}
