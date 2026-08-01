import { type NextRequest, NextResponse } from 'next/server'
import { getVideo } from '@/lib/ytdlp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const ID_RE = /^[a-zA-Z0-9_-]{6,20}$/

// Small in-memory cache so we don't re-run yt-dlp for every range request.
const urlCache = new Map<string, { url: string; expires: number }>()

async function resolveStreamUrl(id: string): Promise<string | null> {
  const cached = urlCache.get(id)
  if (cached && cached.expires > Date.now()) return cached.url

  const video = await getVideo(id)
  if (!video.streamUrl) return null

  // googlevideo urls carry their own expiry; cache for a conservative window.
  urlCache.set(id, { url: video.streamUrl, expires: Date.now() + 60 * 60 * 1000 })
  return video.streamUrl
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!ID_RE.test(id)) {
    return new NextResponse('Invalid id', { status: 400 })
  }

  let sourceUrl: string | null
  try {
    sourceUrl = await resolveStreamUrl(id)
  } catch (err) {
    console.log('[v0] stream resolve error:', (err as Error).message)
    return new NextResponse('Upstream unavailable', { status: 502 })
  }

  if (!sourceUrl) {
    return new NextResponse('No playable stream', { status: 404 })
  }

  const range = req.headers.get('range')
  const upstreamHeaders: Record<string, string> = {
    // Pretend to be a normal browser to keep googlevideo happy.
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  }
  if (range) upstreamHeaders['Range'] = range

  let upstream: Response
  try {
    upstream = await fetch(sourceUrl, { headers: upstreamHeaders })
  } catch (err) {
    console.log('[v0] stream fetch error:', (err as Error).message)
    return new NextResponse('Upstream fetch failed', { status: 502 })
  }

  if (!upstream.ok && upstream.status !== 206) {
    // Cached url may have expired — bust cache so next try re-resolves.
    urlCache.delete(id)
    return new NextResponse('Upstream error', { status: 502 })
  }

  const headers = new Headers()
  headers.set('Content-Type', upstream.headers.get('content-type') || 'video/mp4')
  headers.set('Accept-Ranges', 'bytes')
  const len = upstream.headers.get('content-length')
  if (len) headers.set('Content-Length', len)
  const contentRange = upstream.headers.get('content-range')
  if (contentRange) headers.set('Content-Range', contentRange)
  headers.set('Cache-Control', 'private, max-age=3600')

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  })
}
