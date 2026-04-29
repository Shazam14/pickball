import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET /api/feedback?route=/booking          → comments for a single route
// GET /api/feedback                         → all comments (admin view)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const route = searchParams.get('route')

  let query = getSupabaseAdmin().from('feedback_comments').select('*').order('created_at', { ascending: false })
  if (route) query = query.eq('route', route)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comments: data ?? [] })
}

// POST /api/feedback  → create
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const { route, x_pct, y_pct, viewport_w, viewport_h, scroll_y, message, author } = body

  if (typeof route !== 'string' || !route.startsWith('/')) return NextResponse.json({ error: 'route required' }, { status: 400 })
  if (typeof x_pct !== 'number' || typeof y_pct !== 'number') return NextResponse.json({ error: 'coords required' }, { status: 400 })
  if (typeof message !== 'string' || message.trim().length === 0 || message.length > 1000) return NextResponse.json({ error: 'invalid message' }, { status: 400 })
  if (typeof author !== 'string' || author.trim().length === 0 || author.length > 80) return NextResponse.json({ error: 'invalid author' }, { status: 400 })

  const { data, error } = await getSupabaseAdmin()
    .from('feedback_comments')
    .insert({
      route,
      x_pct,
      y_pct,
      viewport_w: typeof viewport_w === 'number' ? viewport_w : 0,
      viewport_h: typeof viewport_h === 'number' ? viewport_h : 0,
      scroll_y: typeof scroll_y === 'number' ? scroll_y : 0,
      message: message.trim(),
      author: author.trim(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comment: data })
}

// PATCH /api/feedback?id=...  body: { status: 'open' | 'resolved' }
export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await req.json().catch(() => null)
  const status = body?.status
  if (status !== 'open' && status !== 'resolved') return NextResponse.json({ error: 'invalid status' }, { status: 400 })

  const { data, error } = await getSupabaseAdmin()
    .from('feedback_comments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comment: data })
}
