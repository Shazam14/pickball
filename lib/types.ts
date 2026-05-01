export type BookingStatus = 'locked' | 'confirmed' | 'cancelled' | 'expired'

export type PaymentMethod = 'gcash' | 'maya' | 'gotyme'

export interface Booking {
  id: string
  reference: string
  court_number: number
  booking_date: string       // YYYY-MM-DD
  start_time: string         // HH:MM
  end_time: string           // HH:MM
  duration: number           // hours
  players: number
  customer_name: string
  customer_phone: string
  customer_email?: string
  player_names?: string[]
  payment_method?: PaymentMethod
  payment_reference?: string
  status: BookingStatus
  locked_until?: string      // ISO string
  created_at: string
  confirmed_at?: string
}

export interface SlotAvailability {
  time: string               // HH:MM
  taken: boolean
}

export interface CourtAvailability {
  court_number: number
  available: boolean
}

export interface LockSlotRange {
  court_number: number
  start_time: string  // HH:MM
  duration: number    // hours
}

export interface LockSlotRequest {
  // Legacy single-range body (one contiguous block across N courts).
  court_numbers?: number[]
  start_time?: string
  duration?: number
  // New multi-range body (concept-d independent multi-slot). One row per range.
  ranges?: LockSlotRange[]

  booking_date: string
  players: number
  customer_name: string
  customer_phone: string
  customer_email?: string
  player_names?: string[]
}

export interface ConfirmBookingRequest {
  reference: string
  payment_method: PaymentMethod
  payment_reference: string
}

export const COURT_PRICE_PER_HOUR = 700  // peak: weekday 4pm–12am, all weekend, holidays
export const COURT_PRICE_OFFPEAK = 600   // weekday 8am–4pm only
export const ENTRANCE_FEE_PER_PERSON = 50
export const LOCK_DURATION_MINUTES = 5
export const OPEN_HOUR = 8
export const CLOSE_HOUR = 24  // last booking ends at midnight
export const TIME_SLOTS = [
  '08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00',
  '16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00'
]
export const TOTAL_COURTS = 10

// Returns the per-hour court rate for a given booking date and start hour.
// Weekend (Sat/Sun) and holidays are flat peak. Weekdays: off-peak before 4pm.
export function priceForHour(date: string, hour: number, holidays: Set<string>): number {
  const d = new Date(date + 'T00:00:00')
  const dow = d.getDay() // 0=Sun, 6=Sat
  const isWeekend = dow === 0 || dow === 6
  if (isWeekend || holidays.has(date)) return COURT_PRICE_PER_HOUR
  return hour < 16 ? COURT_PRICE_OFFPEAK : COURT_PRICE_PER_HOUR
}

// Court fee for one or more courts spanning [startHour, startHour + duration).
export function courtFeeFor(
  date: string,
  startHour: number,
  durationHours: number,
  courts: number,
  holidays: Set<string>
): number {
  let perCourt = 0
  for (let h = startHour; h < startHour + durationHours; h++) {
    perCourt += priceForHour(date, h, holidays)
  }
  return perCourt * courts
}
