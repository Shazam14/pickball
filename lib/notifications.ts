import { Resend } from 'resend'
import { Booking } from './types'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!)
}

function formatTime(t: string): string {
  const [h] = t.split(':')
  const hr = parseInt(h)
  return hr >= 12 ? `${hr === 12 ? 12 : hr - 12}:00 PM` : `${hr}:00 AM`
}

// ── EMAIL ──────────────────────────────────────────────────────────────────
export async function sendConfirmationEmail(booking: Booking) {
  if (!booking.customer_email) return

  const price = booking.duration * 500

  await getResend().emails.send({
    from: 'SideOut Court Booking <bookings@sideout.ph>',
    to: booking.customer_email,
    subject: `Booking Confirmed — ${booking.reference}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 32px;">
        <h1 style="color: #22c55e; font-size: 28px; margin-bottom: 4px;">SideOut</h1>
        <p style="color: #666; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 32px;">Cebu City · Court Booking</p>

        <div style="background: #111; border: 1px solid rgba(34,197,94,0.3); padding: 24px; margin-bottom: 24px;">
          <div style="color: #22c55e; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;">Booking Confirmed ✓</div>
          <div style="font-size: 24px; font-weight: 700; margin-bottom: 4px;">Court ${booking.court_number}</div>
          <div style="color: #999; font-size: 14px;">${booking.booking_date} · ${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
          <tr style="border-bottom: 1px solid #1a1a1a;">
            <td style="padding: 10px 0; color: #666;">Reference</td>
            <td style="padding: 10px 0; text-align: right; color: #22c55e; font-weight: 600;">${booking.reference}</td>
          </tr>
          <tr style="border-bottom: 1px solid #1a1a1a;">
            <td style="padding: 10px 0; color: #666;">Name</td>
            <td style="padding: 10px 0; text-align: right;">${booking.customer_name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #1a1a1a;">
            <td style="padding: 10px 0; color: #666;">Players</td>
            <td style="padding: 10px 0; text-align: right;">${booking.players} players</td>
          </tr>
          <tr style="border-bottom: 1px solid #1a1a1a;">
            <td style="padding: 10px 0; color: #666;">Payment</td>
            <td style="padding: 10px 0; text-align: right; text-transform: uppercase;">${booking.payment_method}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #666;">Total Paid</td>
            <td style="padding: 10px 0; text-align: right; color: #22c55e; font-weight: 700; font-size: 18px;">₱${price.toLocaleString()}</td>
          </tr>
        </table>

        <p style="color: #666; font-size: 13px; line-height: 1.6;">
          Please arrive 10 minutes before your session. Bring your reference number or this email.
          For questions, call <strong style="color: #fff;">+63 9XX XXX XXXX</strong>.
        </p>
      </div>
    `,
  })
}

// ── SMS via Semaphore ──────────────────────────────────────────────────────
export async function sendConfirmationSMS(booking: Booking) {
  const apiKey = process.env.SEMAPHORE_API_KEY
  if (!apiKey) return

  const price = booking.duration * 500
  const message =
    `SideOut Booking Confirmed!\n` +
    `Ref: ${booking.reference}\n` +
    `Court ${booking.court_number} · ${booking.booking_date}\n` +
    `${formatTime(booking.start_time)}–${formatTime(booking.end_time)}\n` +
    `Total: ₱${price.toLocaleString()}\n` +
    `See you on the court!`

  await fetch('https://api.semaphore.co/api/v4/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: apiKey,
      number: booking.customer_phone,
      message,
      sendername: 'SIDEOUT',
    }),
  })
}
