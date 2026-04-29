'use client'

import styles from './booking.module.css'

interface Props {
  courts: number[]
  hours: number[]
  selectedCourts: number[]
  startH: number | null
  endH: number | null
  isCellBooked: (court: number, hour: number) => boolean
  onToggleCourt: (court: number) => void
  onCellClick: (court: number, hour: number) => void
  formatHour: (h: number) => string
}

export default function CourtHourMatrix({
  courts, hours, selectedCourts, startH, endH,
  isCellBooked, onToggleCourt, onCellClick, formatHour,
}: Props) {
  return (
    <div className={styles.matrixWrap} data-tour="matrix">
      <table className={styles.matrix}>
        <thead>
          <tr>
            <th className={styles.matrixTimeHeader}>TIME</th>
            {courts.map(c => {
              const sel = selectedCourts.includes(c)
              return (
                <th
                  key={c}
                  scope="col"
                  className={`${styles.matrixCourtHeader} ${sel ? styles.matrixCourtHeaderSelected : ''}`}
                  onClick={() => onToggleCourt(c)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Toggle Court ${c}`}
                  aria-pressed={sel}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleCourt(c) } }}
                >
                  C{c}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {hours.map(h => {
            const inRange = startH != null && endH != null && h >= startH && h < endH
            return (
              <tr key={h}>
                <td className={`${styles.matrixTimeCell} ${inRange ? styles.matrixTimeCellSelected : ''}`}>
                  {formatHour(h)}–{formatHour(h + 1)}
                </td>
                {courts.map(c => {
                  const booked = isCellBooked(c, h)
                  const courtSel = selectedCourts.includes(c)
                  const cellSel = courtSel && inRange
                  const cls = [
                    styles.matrixCell,
                    booked ? styles.matrixCellBooked : '',
                    cellSel ? styles.matrixCellSelected : '',
                    courtSel && !booked && !cellSel ? styles.matrixCellInCourt : '',
                  ].filter(Boolean).join(' ')
                  return (
                    <td
                      key={c}
                      className={cls}
                      onClick={() => { if (!booked) onCellClick(c, h) }}
                      role="button"
                      tabIndex={booked ? -1 : 0}
                      aria-disabled={booked}
                      aria-label={`Court ${c} at ${formatHour(h)}`}
                      onKeyDown={(e) => { if (!booked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onCellClick(c, h) } }}
                    >
                      {cellSel ? '✓' : booked ? '×' : ''}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
