// PH national holidays via date.nager.at + Cebu-local holidays the API doesn't carry.
// Cached per-year in-memory; date.nager.at fetch also gets 1-day ISR cache.

type NagerHoliday = { date: string; name: string }

const cache = new Map<number, Set<string>>()

// Cebu-only days. APIs don't carry these; edit here when the city declares more.
function cebuLocalHolidays(year: number): string[] {
  const out: string[] = []
  // Sinulog Sunday — 3rd Sunday of January
  const jan1 = new Date(Date.UTC(year, 0, 1))
  const dow = jan1.getUTCDay()
  const firstSun = dow === 0 ? 1 : 8 - dow
  out.push(isoDate(year, 1, firstSun + 14))
  // Cebu City Charter Day
  out.push(isoDate(year, 2, 24))
  // Cebu Province Founding Anniversary
  out.push(isoDate(year, 8, 6))
  return out
}

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export async function getHolidays(year: number): Promise<Set<string>> {
  const cached = cache.get(year)
  if (cached) return cached

  const dates = new Set<string>()
  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/PH`, {
      next: { revalidate: 86400 },
    })
    if (res.ok) {
      const list = (await res.json()) as NagerHoliday[]
      for (const h of list) dates.add(h.date)
    }
  } catch {
    // Network down — fall through with whatever we have. Cebu locals still apply.
  }
  for (const d of cebuLocalHolidays(year)) dates.add(d)
  cache.set(year, dates)
  return dates
}

export function isHolidaySync(date: string, holidays: Set<string>): boolean {
  return holidays.has(date)
}
