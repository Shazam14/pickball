import { Resend } from 'resend'
import QRCode from 'qrcode'
import { Booking, courtFeeFor, ENTRANCE_FEE_PER_PERSON } from './types'
import { getHolidays } from './holidays'

type Player = { full_name: string | null; checkin_token: string }

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!)
}

function formatTime(t: string): string {
  const [h] = t.split(':')
  const hr = parseInt(h)
  return hr >= 12 ? `${hr === 12 ? 12 : hr - 12}:00 PM` : `${hr}:00 AM`
}

// ── EMAIL ──────────────────────────────────────────────────────────────────
export async function sendConfirmationEmail(
  booking: Booking,
  courtNumbers: number[],
  players: Player[]
) {
  if (!booking.customer_email) return

  players = players.filter(p => p.full_name && p.full_name.trim().length > 0)

  const courts = courtNumbers.length
  const startHour = parseInt(booking.start_time.split(':')[0])
  const year = parseInt(booking.booking_date.slice(0, 4))
  const holidays = await getHolidays(year)
  const courtFee = courtFeeFor(booking.booking_date, startHour, booking.duration, courts, holidays)
  const onsiteEntrance = booking.pay_mode === 'onsite_entrance'
  const entranceFee = booking.players * ENTRANCE_FEE_PER_PERSON
  const total = courtFee + (onsiteEntrance ? 0 : entranceFee)
  const courtLabel = courts === 1
    ? `COURT ${courtNumbers[0]}`
    : `COURTS ${courtNumbers.join(', ')}`

  // QR per player when entrance was paid online. In onsite mode the desk hands
  // QRs out only after each player pays their ₱50 on arrival, so skip here.
  const qrBuffers = onsiteEntrance ? [] : await Promise.all(
    players.map(p =>
      QRCode.toBuffer(`https://sideoutcebu.com/checkin/${p.checkin_token}`, {
        width: 120,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      })
    )
  )

  const playerRows = players.map((p, i) => `
    <tr style="border-bottom: 1px solid #1a1a1a;">
      <td style="padding: 8px 4px; color: #ccc; font-size: 13px;">${i + 1}. ${p.full_name || '—'}</td>
      ${onsiteEntrance ? '' : `<td style="padding: 8px 4px; text-align: right;">
        <img src="cid:qr${i}" width="80" height="80" alt="QR ${i + 1}" style="display:block;margin-left:auto;" />
      </td>`}
    </tr>
  `).join('')

  const attachments = qrBuffers.map((buf, i) => ({
    filename: `qr${i}.png`,
    content: buf,
    content_type: 'image/png',
    content_id: `qr${i}`,
  }))

  await getResend().emails.send({
    from: 'SideOut Court Booking <bookings@sideoutcebu.com>',
    to: booking.customer_email,
    replyTo: ['danielle.kyle.francisco@gmail.com', 'angeleschristinediane@gmail.com'],
    subject: `Booking Confirmed — ${booking.reference}`,
    attachments,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 32px;">
        <h1 style="color: #22c55e; font-size: 28px; margin-bottom: 4px;">SideOut</h1>
        <p style="color: #666; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 32px;">Cebu City · Pickleball Court Booking</p>

        <div style="background: #111; border: 1px solid rgba(34,197,94,0.3); padding: 24px; margin-bottom: 24px;">
          <div style="color: #22c55e; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;">Booking Confirmed ✓</div>
          <div style="font-size: 24px; font-weight: 700; margin-bottom: 4px;">${courtLabel}</div>
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
            <td style="padding: 10px 0; text-align: right; color: #22c55e; font-weight: 700; font-size: 18px;">₱${total.toLocaleString()}</td>
          </tr>
          ${onsiteEntrance ? `<tr>
            <td style="padding: 10px 0; color: #666;">Due at Front Desk</td>
            <td style="padding: 10px 0; text-align: right; color: #f59e0b; font-weight: 700;">₱${entranceFee.toLocaleString()} <span style="color: #666; font-weight: 400; font-size: 12px;">(₱${ENTRANCE_FEE_PER_PERSON} × ${booking.players})</span></td>
          </tr>` : ''}
        </table>

        ${onsiteEntrance ? `
        <div style="background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.4); padding: 16px; margin-bottom: 24px;">
          <div style="color: #f59e0b; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px;">Pay Entrance On Arrival</div>
          <p style="margin: 0; font-size: 13px; color: #ddd; line-height: 1.55;">
            Bring <strong>₱${entranceFee.toLocaleString()}</strong> cash (₱${ENTRANCE_FEE_PER_PERSON} per player). Pay at the front desk on arrival to get each player's check-in QR.
          </p>
        </div>
        ` : ''}

        ${players.length > 0 ? `
        <div style="margin-bottom: 24px;">
          <div style="font-size: 11px; letter-spacing: 2px; color: #666; text-transform: uppercase; margin-bottom: 12px;">Players ${onsiteEntrance ? '' : '— Scan QR to Check In'}</div>
          <table style="width: 100%; border-collapse: collapse;">
            ${playerRows}
          </table>
          <p style="font-size: 12px; color: #555; margin-top: 8px;">${onsiteEntrance ? 'QR codes are issued at the front desk after entrance payment.' : 'Each QR code is unique to one player. Show it at the entrance.'}</p>
        </div>
        ` : ''}

        <p style="color: #666; font-size: 13px; line-height: 1.6;">
          Please arrive 10 minutes before your session. For questions, call <strong style="color: #fff;">+63 9XX XXX XXXX</strong>.
        </p>
      </div>
    `,
  })
}

// ── SMS via Semaphore ──────────────────────────────────────────────────────
export async function sendConfirmationSMS(booking: Booking) {
  const apiKey = process.env.SEMAPHORE_API_KEY
  if (!apiKey) return

  const startHour = parseInt(booking.start_time.split(':')[0])
  const year = parseInt(booking.booking_date.slice(0, 4))
  const holidays = await getHolidays(year)
  const courtFee = courtFeeFor(booking.booking_date, startHour, booking.duration, 1, holidays)
  const onsiteEntrance = booking.pay_mode === 'onsite_entrance'
  const entranceFee = booking.players * ENTRANCE_FEE_PER_PERSON
  const total = courtFee + (onsiteEntrance ? 0 : entranceFee)
  const onsiteLine = onsiteEntrance ? `\nDue on arrival: P${entranceFee} cash (P${ENTRANCE_FEE_PER_PERSON}/player)` : ''
  const message =
    `SideOut Booking Confirmed!\n` +
    `Ref: ${booking.reference}\n` +
    `${booking.booking_date} · ${formatTime(booking.start_time)}–${formatTime(booking.end_time)}\n` +
    `Paid: P${total.toLocaleString()}${onsiteLine}\n` +
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
