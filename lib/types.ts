export type BookingStatus = 'locked' | 'confirmed' | 'cancelled' | 'expired'

export type PaymentMethod = 'gcash' | 'maya' | 'gotyme' | 'onsite'

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

export interface LockSlotRequest {
  court_numbers: number[]
  booking_date: string
  start_time: string
  duration: number
  players: number
  customer_name: string
  customer_phone: string
  customer_email?: string
}

export interface ConfirmBookingRequest {
  reference: string
  payment_method: PaymentMethod
  payment_reference: string
}

export const COURT_PRICE_PER_HOUR = 700
export const ENTRANCE_FEE_PER_PERSON = 50
export const LOCK_DURATION_MINUTES = 5
export const TIME_SLOTS = [
  '06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00',
  '14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'
]
export const TOTAL_COURTS = 10
