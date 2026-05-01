'use client'

import styles from './booking.module.css'

export type Slot = { court: number; hour: number }

type RowStatus = 'available' | 'booked'

const STATUS_BORDER: Record<RowStatus, string> = {
  available: 'transparent',
  booked: '#ef4444',
}

interface Props {
  courts: number[]
  hours: number[]
  isCellBooked: (court: number, hour: number) => boolean
  isCellHeld: (court: number, hour: number) => boolean
  isCellSelected: (court: number, hour: number) => boolean
  onCellClick: (court: number, hour: number) => void
  formatHour: (h: number) => string
  getRowStatus?: (h: number) => RowStatus
}

export default function CourtHourMatrix({
  courts, hours, isCellBooked, isCellHeld, isCellSelected, onCellClick, formatHour, getRowStatus,
}: Props) {
  return (
    <div className={styles.matrixWrap} data-tour="matrix">
      <table className={styles.matrix}>
        <thead>
          <tr>
            <th className={styles.matrixTimeHeader}>TIME</th>
            {courts.map(c => (
              <th key={c} scope="col" className={`${styles.matrixCourtHeader} ${styles.matrixCourtHeaderPassive}`}>COURT {c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map(h => (
            <tr key={h}>
              <td
                className={styles.matrixTimeCell}
                style={getRowStatus ? { borderLeft: `4px solid ${STATUS_BORDER[getRowStatus(h)]}` } : undefined}
              >
                {formatHour(h)}–{formatHour(h + 1)}
              </td>
              {courts.map(c => {
                const booked = isCellBooked(c, h)
                const held = !booked && isCellHeld(c, h)
                const selected = !booked && !held && isCellSelected(c, h)
                const disabled = booked || held
                const cls = [
                  styles.matrixCell,
                  booked ? styles.matrixCellBooked : '',
                  held ? styles.matrixCellHeld : '',
                  selected ? styles.matrixCellSelected : '',
                ].filter(Boolean).join(' ')
                let glyph = ''
                if (booked) glyph = '×'
                else if (held) glyph = '⏱'
                else if (selected) glyph = '✓'
                return (
                  <td
                    key={c}
                    className={cls}
                    onClick={() => { if (!disabled) onCellClick(c, h) }}
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    aria-disabled={disabled}
                    aria-pressed={selected}
                    aria-label={`Court ${c} at ${formatHour(h)}`}
                    onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onCellClick(c, h) } }}
                  >
                    {glyph}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
