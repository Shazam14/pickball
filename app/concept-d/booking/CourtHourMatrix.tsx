'use client'

import styles from './booking.module.css'

export type Selection = { court: number; anchorH: number; endH: number | null }

type RowStatus = 'available' | 'limited' | 'booked'

const STATUS_BORDER: Record<RowStatus, string> = {
  available: 'transparent',
  limited: '#f59e0b',
  booked: '#ef4444',
}

interface Props {
  courts: number[]
  hours: number[]
  selections: Selection[]
  isCellBooked: (court: number, hour: number) => boolean
  onCellClick: (court: number, hour: number) => void
  formatHour: (h: number) => string
  getRowStatus?: (h: number) => RowStatus
}

function selectionForCourt(selections: Selection[], court: number): Selection | null {
  return selections.find(s => s.court === court) ?? null
}

function rangeOf(s: Selection): { min: number; max: number } | null {
  if (s.endH === null) return null
  return { min: Math.min(s.anchorH, s.endH), max: Math.max(s.anchorH, s.endH) }
}

export default function CourtHourMatrix({
  courts, hours, selections, isCellBooked, onCellClick, formatHour, getRowStatus,
}: Props) {
  return (
    <div className={styles.matrixWrap} data-tour="matrix">
      <table className={styles.matrix}>
        <thead>
          <tr>
            <th className={styles.matrixTimeHeader}>TIME</th>
            {courts.map(c => {
              const sel = selectionForCourt(selections, c)
              const cls = [
                styles.matrixCourtHeader,
                sel ? styles.matrixCourtHeaderSelected : '',
                styles.matrixCourtHeaderPassive,
              ].filter(Boolean).join(' ')
              return <th key={c} scope="col" className={cls}>SO{c}</th>
            })}
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
                const sel = selectionForCourt(selections, c)
                const isAnchorCell = sel !== null && sel.endH === null && sel.anchorH === h
                const range = sel ? rangeOf(sel) : null
                const inRange = range !== null && h >= range.min && h <= range.max
                const disabled = booked
                const cls = [
                  styles.matrixCell,
                  booked ? styles.matrixCellBooked : '',
                  isAnchorCell ? styles.matrixCellAnchor : '',
                  inRange ? styles.matrixCellSelected : '',
                ].filter(Boolean).join(' ')
                let glyph = ''
                if (booked) glyph = '×'
                else if (isAnchorCell) glyph = '●'
                else if (inRange) glyph = '✓'
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
