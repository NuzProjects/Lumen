import { type NextRequest, NextResponse } from 'next/server'
import { search } from '@/lib/ytdlp'
import { cached } from '@/lib/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  const limit = Math.min(
    Number(req.nextUrl.searchParams.get('limit')) || 24,
    40,
  )

  if (!q) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 })
  }

  try {
    const results = await cached(`search:${limit}:${q.toLowerCase()}`, 15 * 60_000, () =>
      search(q, limit),
    )
    return NextResponse.json(
      { query: q, results },
      { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=900' } },
    )
  } catch (err) {
    console.log('[v0] search error:', (err as Error).message)
    return NextResponse.json(
      { error: 'Search failed', detail: (err as Error).message, results: [] },
      { status: 502 },
    )
  }
}
