'use client'

import { useState, useCallback } from 'react'
import CountdownTimer from './CountdownTimer'
import { PaymentMethod } from '@/lib/types'
import styles from './BookingModal.module.css'

interface BookingDetails {
  reference: string
  lockedUntil: string
  courtNumbers: number[]
  bookingDate: string
  startTime: string
  endTime: string
  duration: number
  players: number
  price: number
  courtFee: number
  entranceFee: number
}

interface Props {
  details: BookingDetails
  onSuccess: (reference: string) => void
  onExpire: () => void
  onClose: () => void
}

type Step = 'payment' | 'reference'

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
  {
    id: 'onsite',
    label: 'Pay Onsite',
    color: '#22c55e',
    instructions: 'Reserve now and pay at the venue when you arrive. Bring exact change or any accepted method.',
  },
]

function formatTime(t: string) {
  const [h] = t.split(':')
  const hr = parseInt(h)
  return hr >= 12 ? `${hr === 12 ? 12 : hr - 12}:00 ${hr >= 12 ? 'PM' : 'AM'}` : `${hr}:00 AM`
}

export default function BookingModal({ details, onSuccess, onExpire, onClose }: Props) {
  const [step, setStep] = useState<Step>('payment')
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleExpire = useCallback(() => {
    onExpire()
  }, [onExpire])

  async function handleConfirm(opts?: { onsite?: boolean }) {
    if (!method) {
      setError('Please select a payment method.')
      return
    }
    if (!opts?.onsite && !reference.trim()) {
      setError('Please enter your reference number.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/confirm-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: details.reference,
          payment_method: method,
          payment_reference: opts?.onsite ? 'ONSITE' : reference.trim(),
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
            <span>{details.courtNumbers.length > 1 ? 'Courts' : 'Court'}</span><span>{details.courtNumbers.map(n => `Court ${n}`).join(', ')}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Date</span><span>{details.bookingDate}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Time</span><span>{formatTime(details.startTime)} – {formatTime(details.endTime)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Players</span><span>{details.players}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>{details.courtNumbers.length > 1 ? `${details.courtNumbers.length} Courts × ${details.duration}h` : `Court (${details.duration}h)`}</span><span>₱{details.courtFee.toLocaleString()}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Entrance ({details.players}× ₱50)</span><span>₱{details.entranceFee.toLocaleString()}</span>
          </div>
          <div className={`${styles.summaryRow} ${styles.total}`}>
            <span>Total</span><span>₱{details.price.toLocaleString()}</span>
          </div>
        </div>

        {/* Step 1: Payment method */}
        {step === 'payment' && (
          <div>
            <div className={styles.stepLabel}>Step 1 — Choose Payment</div>
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

            {selectedMethod && method !== 'onsite' && (
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

            {selectedMethod && method === 'onsite' && (
              <div className={styles.payInstructions}>
                <p className={styles.instructions}>{selectedMethod.instructions}</p>
                <div className={styles.amount}>
                  Pay at venue: <strong>₱{details.price.toLocaleString()}</strong>
                </div>
              </div>
            )}

            {error && method === 'onsite' && <div className={styles.error}>{error}</div>}

            {method === 'onsite' ? (
              <button
                className="btn-primary"
                style={{ width: '100%', clipPath: 'none', marginTop: 16 }}
                disabled={loading}
                onClick={() => handleConfirm({ onsite: true })}
              >
                {loading ? 'Confirming...' : 'Confirm Reservation →'}
              </button>
            ) : (
              <button
                className="btn-primary"
                style={{ width: '100%', clipPath: 'none', marginTop: 16 }}
                disabled={!method}
                onClick={() => setStep('reference')}
              >
                I&apos;ve Paid — Enter Reference →
              </button>
            )}
          </div>
        )}

        {/* Step 2: Reference number */}
        {step === 'reference' && (
          <div>
            <div className={styles.stepLabel}>Step 2 — Confirm Payment</div>
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
              onClick={() => handleConfirm()}
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
