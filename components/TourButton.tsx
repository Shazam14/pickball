'use client'

// Generic guided-tour trigger built on driver.js.
// Auto-runs once per (storageKey) on first visit, then can be re-triggered
// from the rendered button.

import { useCallback, useEffect, useRef } from 'react'
import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'

export type TourStep = DriveStep

interface Props {
  storageKey: string
  steps: TourStep[]
  label?: string
  className?: string
}

export default function TourButton({ storageKey, steps, label = '↻ Take a tour', className }: Props) {
  const startedRef = useRef(false)

  const start = useCallback(() => {
    // Skip steps whose element selector isn't on the page right now
    // (e.g. a panel that only appears once the user makes a selection).
    const live = steps.filter(s => {
      if (typeof s.element !== 'string') return true
      return !!document.querySelector(s.element)
    })
    if (live.length === 0) return
    const d = driver({
      showProgress: true,
      allowClose: true,
      animate: true,
      stagePadding: 6,
      popoverClass: 'sideout-tour',
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Got it',
      steps: live,
    })
    d.drive()
  }, [steps])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    if (typeof window === 'undefined') return
    try {
      if (!localStorage.getItem(storageKey)) {
        // Defer slightly so the page can lay out before the popover anchors.
        const id = window.setTimeout(() => {
          start()
          localStorage.setItem(storageKey, '1')
        }, 600)
        return () => window.clearTimeout(id)
      }
    } catch {}
  }, [storageKey, start])

  return (
    <button type="button" onClick={start} className={className}>
      {label}
    </button>
  )
}
