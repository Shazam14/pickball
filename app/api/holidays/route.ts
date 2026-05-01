import { NextRequest, NextResponse } from 'next/server'
import { getHolidays } from '@/lib/holidays'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const yearRaw = searchParams.get('year')
  const year = yearRaw ? parseInt(yearRaw) : new Date().getFullYear()
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: 'invalid year' }, { status: 400 })
  }
  const dates = await getHolidays(year)
  return NextResponse.json({ year, dates: Array.from(dates).sort() })
}
