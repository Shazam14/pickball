'use client'

import { useState, useCallback } from 'react'
import CountdownTimer from './CountdownTimer'
import { PaymentMethod } from '@/lib/types'
import styles from './BookingModal.module.css'

interface BookingDetails {
  bookingId: string
  reference: string
  lockedUntil: string
  courtNumber: number
  bookingDate: string
  startTime: string
  endTime: string
  duration: number
  players: number
  price: number
}

interface Props {
  details: BookingDetails
  onSuccess: (reference: string) => void
  onExpire: () => void
  onClose: () => void
}

type Step = 'details' | 'payment' | 'reference'

const PAYMENT_METHODS: { id: PaymentMethod; label: string; color: string; instructions: string }[] = [
  {
    id: 'gcash',
    label: 'GCash',
    color: '#007dff',
    instructions: 'Scan the QR code with your GCash app or send to 09XX XXX XXXX. Enter your reference number below.',
  },
  {
    id: 'maya',
    label: 'Maya',
    color: '#6c3caa',
    instructions: 'Scan the QR code with your Maya app or send to 09XX XXX XXXX. Enter your reference number below.',
  },
  {
    id: 'gotyme',
    label: 'GoTyme',
    color: '#f59e0b',
    instructions: 'Transfer via GoTyme Bank to Account No. XXXX-XXXX-XX (SideOut Cebu). Enter your reference number below.',
  },
]

function formatTime(t: string) {
  const [h] = t.split(':')
  const hr = parseInt(h)
  return hr >= 12 ? `${hr === 12 ? 12 : hr - 12}:00 ${hr >= 12 ? 'PM' : 'AM'}` : `${hr}:00 AM`
}

export default function BookingModal({ details, onSuccess, onExpire, onClose }: Props) {
  const [step, setStep] = useState<Step>('details')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleExpire = useCallback(() => {
    onExpire()
  }, [onExpire])

  async function handleConfirm() {
    if (!method || !reference.trim()) {
      setError('Please select a payment method and enter your reference number.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/confirm-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: details.bookingId,
          payment_method: method,
          payment_reference: reference.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        if (res.status === 410) onExpire()
      } else {
        onSuccess(data.reference)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const selectedMethod = PAYMENT_METHODS.find(m => m.id === method)

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>

        {/* Countdown always visible */}
        <CountdownTimer lockedUntil={details.lockedUntil} onExpire={handleExpire} />

        {/* Booking summary */}
        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span>Court</span><span>Court {details.courtNumber}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Date</span><span>{details.bookingDate}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Time</span><span>{formatTime(details.startTime)} – {formatTime(details.endTime)}</span>
          </div>
          <div className={`${styles.summaryRow} ${styles.total}`}>
            <span>Total</span><span>₱{details.price.toLocaleString()}</span>
          </div>
        </div>

        {/* Step 1: Customer details */}
        {step === 'details' && (
          <div>
            <div className={styles.stepLabel}>Step 1 — Your Details</div>
            <div className={styles.field}>
              <label className="field-label">Full Name *</label>
              <input className="field-input" value={name} onChange={e => setName(e.target.value)} placeholder="Juan dela Cruz" />
            </div>
            <div className={styles.field}>
              <label className="field-label">Phone Number *</label>
              <input className="field-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+63 9XX XXX XXXX" />
            </div>
            <div className={styles.field}>
              <label className="field-label">Email (for confirmation)</label>
              <input className="field-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="juan@email.com" />
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <button
              className="btn-primary"
              style={{ width: '100%', clipPath: 'none', marginTop: 8 }}
              onClick={() => {
                if (!name.trim() || !phone.trim()) { setError('Name and phone are required.'); return }
                setError('')
                setStep('payment')
              }}
            >
              Continue to Payment →
            </button>
          </div>
        )}

        {/* Step 2: Payment method */}
        {step === 'payment' && (
          <div>
            <div className={styles.stepLabel}>Step 2 — Choose Payment</div>
            <div className={styles.methodGrid}>
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.id}
                  className={`${styles.methodBtn} ${method === m.id ? styles.methodSelected : ''}`}
                  style={method === m.id ? { borderColor: m.color } : {}}
                  onClick={() => setMethod(m.id)}
                >
                  <span className={styles.methodLabel} style={method === m.id ? { color: m.color } : {}}>
                    {m.label}
                  </span>
                </button>
              ))}
            </div>

            {selectedMethod && (
              <div className={styles.payInstructions}>
                {/* QR placeholder — replace with real QR image per method */}
                <div className={styles.qrPlaceholder}>
                  <div className={styles.qrInner}>
                    <span style={{ fontSize: 32 }}>
                      {method === 'gcash' ? '💙' : method === 'maya' ? '💜' : method === 'gotyme' ? '🏦' : ''}
                    </span>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, letterSpacing: 1 }}>
                      QR CODE
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                      Replace with real QR image
                    </div>
                  </div>
                </div>
                <p className={styles.instructions}>{selectedMethod.instructions}</p>
                <div className={styles.amount}>
                  Send exactly: <strong>₱{details.price.toLocaleString()}</strong>
                </div>
              </div>
            )}

            <button
              className="btn-primary"
              style={{ width: '100%', clipPath: 'none', marginTop: 16 }}
              disabled={!method}
              onClick={() => setStep('reference')}
            >
              I've Paid — Enter Reference →
            </button>
          </div>
        )}

        {/* Step 3: Reference number */}
        {step === 'reference' && (
          <div>
            <div className={styles.stepLabel}>Step 3 — Confirm Payment</div>
            <div className={styles.field}>
              <label className="field-label">{selectedMethod?.label} Reference Number *</label>
              <input
                className="field-input"
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="e.g. 12345678901234"
                style={{ letterSpacing: 2, fontFamily: 'monospace' }}
              />
              <div className={styles.hint}>Found in your {selectedMethod?.label} transaction history</div>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <button
              className="btn-primary"
              style={{ width: '100%', clipPath: 'none', marginTop: 8 }}
              disabled={loading || !reference.trim()}
              onClick={handleConfirm}
            >
              {loading ? 'Confirming...' : 'Confirm Booking →'}
            </button>
            <button className={styles.backBtn} onClick={() => setStep('payment')}>← Back</button>
          </div>
        )}
      </div>
    </div>
  )
}
