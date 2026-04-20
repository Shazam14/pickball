'use client'

import { useEffect, useState } from 'react'
import styles from './CountdownTimer.module.css'

interface Props {
  lockedUntil: string   // ISO string
  onExpire: () => void
}

export default function CountdownTimer({ lockedUntil, onExpire }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    const calc = () => Math.max(0, Math.floor((new Date(lockedUntil).getTime() - Date.now()) / 1000))
    setSecondsLeft(calc())

    const interval = setInterval(() => {
      const s = calc()
      setSecondsLeft(s)
      if (s === 0) {
        clearInterval(interval)
        onExpire()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [lockedUntil, onExpire])

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const isUrgent = secondsLeft <= 60

  return (
    <div className={`${styles.timer} ${isUrgent ? styles.urgent : ''}`}>
      <div className={styles.label}>⏱ Slot reserved for</div>
      <div className={styles.time}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>
      <div className={styles.sub}>Complete payment before time runs out</div>
      <div className={styles.bar}>
        <div
          className={styles.fill}
          style={{ width: `${(secondsLeft / (5 * 60)) * 100}%` }}
        />
      </div>
    </div>
  )
}
