import { test, expect } from '@playwright/test'
import { hoursOverlap, hourOf } from '../lib/booking-conflict'

// Pure unit tests — no browser/page interaction. Guards against the
// 'HH:MM:SS' vs 'HH:MM' string-compare bug (commit-fix for held-cell
// false-positive in /api/lock-slot).

test.describe('hourOf', () => {
  test('parses both HH:MM and HH:MM:SS', () => {
    expect(hourOf('07:00')).toBe(7)
    expect(hourOf('07:00:00')).toBe(7)
    expect(hourOf('15:00:00')).toBe(15)
  })
})

test.describe('hoursOverlap', () => {
  // Postgres TIME read-back format is 'HH:MM:SS'; new req is 'HH:MM'.
  // The bug was: '08:00:00' > '08:00' lex-compared TRUE → false conflict.

  test('adjacent intervals (existing ends where new starts) do NOT overlap — bug case', () => {
    // existing 7-8AM (DB format), new 8-9AM (request format)
    expect(hoursOverlap('07:00:00', '08:00:00', '08:00', '09:00')).toBe(false)
  })

  test('adjacent intervals (existing starts where new ends) do NOT overlap', () => {
    // existing 9-10AM (DB), new 8-9AM (req)
    expect(hoursOverlap('09:00:00', '10:00:00', '08:00', '09:00')).toBe(false)
  })

  test('truly overlapping intervals DO overlap', () => {
    // existing 7-9AM, new 8-9AM
    expect(hoursOverlap('07:00:00', '09:00:00', '08:00', '09:00')).toBe(true)
  })

  test('identical intervals overlap', () => {
    expect(hoursOverlap('08:00:00', '09:00:00', '08:00', '09:00')).toBe(true)
  })

  test('existing fully contains new', () => {
    // existing 7-11AM, new 8-9AM
    expect(hoursOverlap('07:00:00', '11:00:00', '08:00', '09:00')).toBe(true)
  })

  test('new fully contains existing', () => {
    // existing 8-9AM, new 7-11AM
    expect(hoursOverlap('08:00:00', '09:00:00', '07:00', '11:00')).toBe(true)
  })

  test('disjoint intervals do NOT overlap', () => {
    // existing 7-8AM, new 10-11AM
    expect(hoursOverlap('07:00:00', '08:00:00', '10:00', '11:00')).toBe(false)
  })
})
