import { type NextRequest, NextResponse } from 'next/server'
import { search, type VideoSummary } from '@/lib/ytdlp'
import { cached } from '@/lib/cache'
import { getPopularYouTubeVideos } from '@/lib/youtube-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Curated topics that power the "For You" feed.
export const CATEGORIES: Record<string, string[]> = {
  'For You': [
    'trending educational videos',
    'lofi study music',
    'science explained',
    'how things work',
  ],
  Study: ['study with me', 'lofi hip hop study', 'productivity tips', 'note taking methods'],
  Science: ['space documentary', 'physics explained', 'chemistry experiments', 'biology crash course'],
  Coding: ['learn to code', 'javascript tutorial', 'python project', 'web development'],
  History: ['history documentary', 'ancient civilizations', 'world war explained', 'history facts'],
  Math: ['math explained', 'calculus tutorial', 'algebra basics', 'fun math problems'],
  Gaming: ['minecraft', 'speedrun', 'game review', 'gaming highlights'],
  Music: ['official music video', 'live performance', 'music mix', 'top songs'],
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category') || 'For You'
  const queries = CATEGORIES[category] || CATEGORIES['For You']

  try {
    // Keep For You fresh while sharing category lookups between visitors.
    const candidates = await cached(`feed:v3:${category}`, category === 'For You' ? 5 * 60_000 : 15 * 60_000, async () => {
      if (category === 'For You') {
        const popular = await getPopularYouTubeVideos(24)
        if (popular?.length) return popular as VideoSummary[]
      }
      // Query a few topics in parallel and interleave the results.
      const picked = shuffle(queries).slice(0, 3)
      const batches = await Promise.allSettled(picked.map((q) => search(q, 8)))

      const seen = new Set<string>()
      const out: VideoSummary[] = []
      const lists = batches
        .filter((b) => b.status === 'fulfilled')
        .map((b) => (b as PromiseFulfilledResult<VideoSummary[]>).value)

      // Round-robin interleave for variety.
      const maxLen = Math.max(0, ...lists.map((l) => l.length))
      for (let i = 0; i < maxLen; i++) {
        for (const list of lists) {
          const item = list[i]
          if (item && !seen.has(item.id)) {
            seen.add(item.id)
            out.push(item)
          }
        }
      }
      return out
    })

    if (candidates.length === 0) {
      return NextResponse.json(
        { category, results: [], error: 'No results' },
        { status: 502 },
      )
    }

    // Keep the upstream candidate pool warm, but vary the visible For You
    // selection on every request so a reload is not locked to one feed.
    const results = category === 'For You' ? shuffle(candidates).slice(0, 24) : candidates

    return NextResponse.json(
      { category, results },
      { headers: { 'Cache-Control': category === 'For You' ? 'no-store' : 'public, max-age=300, stale-while-revalidate=300' } },
    )
  } catch (err) {
    console.log('[v0] feed error:', (err as Error).message)
    return NextResponse.json(
      { category, results: [], error: (err as Error).message },
      { status: 502 },
    )
  }
}
