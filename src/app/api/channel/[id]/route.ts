import { type NextRequest, NextResponse } from 'next/server'
import { cached } from '@/lib/cache'
import { getChannel } from '@/lib/ytdlp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CHANNEL_ID_RE = /^[a-zA-Z0-9_-]{10,40}$/

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!CHANNEL_ID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid channel id' }, { status: 400 })
  }

  try {
    const channel = await cached(
      `channel:v4:${id}`,
      15 * 60_000,
      () => getChannel(id, request.nextUrl.searchParams.get('name') || undefined),
    )
    return NextResponse.json(channel, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=900' },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Could not load this channel', detail: (error as Error).message },
      { status: 502 },
    )
  }
}
