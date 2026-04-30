'use client'

import styles from './booking.module.css'

interface Props {
  courts: number[]
  hours: number[]
  selectedCourts: number[]
  startH: number | null
  endH: number | null
  phase: 'time' | 'courts'
  isCellBooked: (court: number, hour: number) => boolean
  onToggleCourt: (court: number) => void
  onCellClick: (court: number, hour: number) => void
  formatHour: (h: number) => string
}

export default function CourtHourMatrix({
  courts, hours, selectedCourts, startH, endH, phase,
  isCellBooked, onToggleCourt, onCellClick, formatHour,
}: Props) {
  const headersInteractive = phase === 'courts'
  const cellsInteractive = phase === 'time'
  const anchorCourt = selectedCourts[0]

  return (
    <div className={styles.matrixWrap} data-tour="matrix">
      <table className={styles.matrix}>
        <thead>
          <tr>
            <th className={styles.matrixTimeHeader}>TIME</th>
            {courts.map(c => {
              const sel = selectedCourts.includes(c)
              const isAnchor = c === anchorCourt
              const cls = [
                styles.matrixCourtHeader,
                sel ? styles.matrixCourtHeaderSelected : '',
                !headersInteractive ? styles.matrixCourtHeaderPassive : '',
              ].filter(Boolean).join(' ')
              if (!headersInteractive) {
                return <th key={c} scope="col" className={cls}>SO{c}</th>
              }
              return (
                <th
                  key={c}
                  scope="col"
                  className={cls}
                  onClick={() => { if (!isAnchor) onToggleCourt(c) }}
                  role="button"
                  tabIndex={isAnchor ? -1 : 0}
                  aria-label={`Toggle Court ${c}`}
                  aria-pressed={sel}
                  aria-disabled={isAnchor}
                  onKeyDown={(e) => { if (!isAnchor && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onToggleCourt(c) } }}
                >
                  SO{c}
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
                  const disabled = booked || !cellsInteractive
                  const cls = [
                    styles.matrixCell,
                    booked ? styles.matrixCellBooked : '',
                    cellSel ? styles.matrixCellSelected : '',
                    !cellsInteractive && !cellSel && !booked ? styles.matrixCellLocked : '',
                  ].filter(Boolean).join(' ')
                  return (
                    <td
                      key={c}
                      className={cls}
                      onClick={() => { if (!disabled) onCellClick(c, h) }}
                      role="button"
                      tabIndex={disabled ? -1 : 0}
                      aria-disabled={disabled}
                      aria-label={`Court ${c} at ${formatHour(h)}`}
                      onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onCellClick(c, h) } }}
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
