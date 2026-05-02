// Postgres TIME columns serialize back as 'HH:MM:SS' even when written as
// 'HH:MM', so raw lex compare across the two formats wrongly flags adjacent
// intervals (existing '08:00:00' > new '08:00') as overlapping. Compare on
// numeric hour instead — the booking model is hour-aligned anyway.
export function hourOf(t: string): number {
  return parseInt(t.split(':')[0])
}

export function hoursOverlap(
  aStart: string, aEnd: string,
  bStart: string, bEnd: string,
): boolean {
  return hourOf(aStart) < hourOf(bEnd) && hourOf(aEnd) > hourOf(bStart)
}
