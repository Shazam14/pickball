'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import adminStyles from '../../admin.module.css'
import styles from './walkin.module.css'
import {
  WALKIN_FEE_PHP,
  WALKIN_COUPON_PHP,
  WIFI_SSID,
  WIFI_PASSWORD,
  WIFI_FREE_MINUTES,
} from '@/lib/walkin-config'

type Ticket = { id: string; token: string; ticket_index: number }
type Walkin = {
  id: string
  reference: string
  party_size: number
  paid_amount_php: number
  created_at: string
}

function fmtIssued(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

// Standard WiFi QR payload — phone cameras auto-prompt to join.
function wifiPayload(ssid: string, password: string) {
  const esc = (s: string) => s.replace(/([\\;,:"])/g, '\\$1')
  return `WIFI:T:WPA;S:${esc(ssid)};P:${esc(password)};;`
}

export default function NewWalkinPage() {
  const [key, setKey] = useState('')
  const [authed, setAuthed] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [authError, setAuthError] = useState('')

  const [partySize, setPartySize] = useState(1)
  const [createdBy, setCreatedBy] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  const [walkin, setWalkin] = useState<Walkin | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [redeemQrs, setRedeemQrs] = useState<Record<string, string>>({})
  const [wifiQr, setWifiQr] = useState('')

  useEffect(() => {
    const stored = sessionStorage.getItem('admin_key') || ''
    if (stored) {
      setKey(stored)
      setAuthed(true)
    }
    setCreatedBy(localStorage.getItem('admin_edited_by') || '')
  }, [])

  // Generate WiFi QR once on mount.
  useEffect(() => {
    QRCode.toDataURL(wifiPayload(WIFI_SSID, WIFI_PASSWORD), { width: 220, margin: 1 })
      .then(setWifiQr)
      .catch(() => setWifiQr(''))
  }, [])

  // Generate redemption QRs whenever a fresh batch of tickets is minted.
  useEffect(() => {
    if (tickets.length === 0) {
      setRedeemQrs({})
      return
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    Promise.all(
      tickets.map(t =>
        QRCode.toDataURL(`${origin}/admin/walkin/${t.token}`, { width: 320, margin: 1 })
          .then(url => [t.token, url] as const)
      )
    ).then(pairs => setRedeemQrs(Object.fromEntries(pairs)))
  }, [tickets])

  async function handleLogin() {
    setAuthError('')
    const res = await fetch(`/api/admin/walkin?key=${encodeURIComponent(pwInput)}`)
    if (res.status === 401) {
      setAuthError('Invalid password')
      return
    }
    sessionStorage.setItem('admin_key', pwInput)
    setKey(pwInput)
    setAuthed(true)
  }

  function rememberCreatedBy(v: string) {
    setCreatedBy(v)
    localStorage.setItem('admin_edited_by', v)
  }

  async function handleMint() {
    setErrMsg('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/walkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          party_size: partySize,
          created_by: createdBy || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrMsg(data.error || `HTTP ${res.status}`)
        return
      }
      setWalkin(data.walkin)
      setTickets(data.tickets)
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setWalkin(null)
    setTickets([])
    setErrMsg('')
  }

  const totalDue = useMemo(() => partySize * WALKIN_FEE_PHP, [partySize])

  if (!authed) {
    return (
      <div className={adminStyles.loginPage}>
        <div className={adminStyles.loginCard}>
          <h1 className={adminStyles.loginTitle}>Admin Access</h1>
          {authError && <div className={styles.errLine}>{authError}</div>}
          <input
            className={styles.input}
            type="password"
            placeholder="Password"
            value={pwInput}
            onChange={e => setPwInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <button className={styles.mintBtn} onClick={handleLogin}>Sign In</button>
        </div>
      </div>
    )
  }

  return (
    <div className={adminStyles.page}>
      <div className={adminStyles.header}>
        <h1 className={adminStyles.title}>Walk-in · New Ticket</h1>
        <div className={adminStyles.headerRight}>
          <Link className={adminStyles.refreshBtn} href="/admin">← Dashboard</Link>
        </div>
      </div>

      {!walkin && (
        <div className={styles.formCard}>
          <label className={styles.label}>Front-Desk Name (saved locally)</label>
          <input
            className={styles.input}
            type="text"
            placeholder="e.g. Kyle"
            value={createdBy}
            onChange={e => rememberCreatedBy(e.target.value)}
          />

          <label className={styles.label}>Party Size</label>
          <div className={styles.stepper}>
            <button
              className={styles.stepBtn}
              onClick={() => setPartySize(n => Math.max(1, n - 1))}
              disabled={partySize <= 1}
            >−</button>
            <div className={styles.stepCount}>{partySize}</div>
            <button
              className={styles.stepBtn}
              onClick={() => setPartySize(n => Math.min(20, n + 1))}
              disabled={partySize >= 20}
            >+</button>
          </div>

          <div className={styles.feeLine}>
            Cash collected: <span className={styles.feeAmount}>₱{totalDue}</span>{' '}
            ({partySize} × ₱{WALKIN_FEE_PHP})
          </div>

          {errMsg && <div className={styles.errLine}>{errMsg}</div>}

          <button
            className={styles.mintBtn}
            onClick={handleMint}
            disabled={submitting}
          >
            {submitting ? 'Minting…' : `Print ${partySize} Ticket${partySize > 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {walkin && (
        <>
          <div className={styles.printActions}>
            <button className={styles.printBtn} onClick={() => window.print()}>
              🖨 Print Tickets
            </button>
            <button className={styles.againBtn} onClick={reset}>
              + New Batch
            </button>
          </div>

          <div className={`${styles.printArea} printArea`}>
            <div className={styles.previewStrip}>
              {tickets.map(t => (
                <div className={styles.ticket} key={t.token}>
                  <div className={styles.ticketHeader}>
                    <div className={styles.ticketBrand}>SIDEOUT</div>
                    <div className={styles.ticketSub}>Walk-in Pass · Cebu</div>
                  </div>

                  <div className={styles.ticketMeta}>
                    <span>{walkin.reference}</span>
                    <span>Ticket {t.ticket_index} of {walkin.party_size}</span>
                  </div>
                  <div className={styles.ticketMeta}>
                    <span>Issued</span>
                    <span>{fmtIssued(walkin.created_at)}</span>
                  </div>

                  <div className={styles.qrWrap}>
                    {redeemQrs[t.token] && (
                      <img src={redeemQrs[t.token]} alt="Redemption QR" />
                    )}
                  </div>
                  <div className={styles.qrCaption}>Scan at café / merch</div>

                  <div className={styles.couponBox}>
                    <div className={styles.couponAmt}>₱{WALKIN_COUPON_PHP} OFF</div>
                    <div className={styles.couponRule}>
                      Single-use coupon · Valid today · Café or merch
                    </div>
                  </div>

                  <div className={styles.wifiBox}>
                    {wifiQr && (
                      <div className={styles.wifiSmallQr}>
                        <img src={wifiQr} alt="WiFi QR" />
                      </div>
                    )}
                    <div className={styles.wifiCreds}>
                      📶 <strong>{WIFI_SSID}</strong> · {WIFI_PASSWORD}
                    </div>
                    <div className={styles.qrCaption}>
                      Free WiFi · {WIFI_FREE_MINUTES} min
                    </div>
                  </div>

                  <div className={styles.ticketFoot}>
                    sideoutcebu.com · Thanks for dropping in
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
