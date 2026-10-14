import { NextResponse } from 'next/server'
import { getRandomYouTubeShorts } from '@/lib/youtube-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const topics = new URL(request.url).searchParams.get('topics')?.split(',').map((topic) => topic.trim()).filter(Boolean).slice(0, 8)
  const results = await getRandomYouTubeShorts(18, topics)
  if (!results?.length) {
    return NextResponse.json({ error: 'Shorts are taking a moment', results: [] }, { status: 502 })
  }
  return NextResponse.json({ results }, { headers: { 'Cache-Control': 'no-store' } })
}
