import { type NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ID_RE = /^[a-zA-Z0-9_-]{6,20}$/

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!ID_RE.test(id)) {
    return new NextResponse('Invalid id', { status: 400 })
  }

  const candidates = [
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    `https://i.ytimg.com/vi_webp/${id}/hqdefault.webp`,
  ]

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        },
      })
      if (res.ok && res.body) {
        return new NextResponse(res.body, {
          status: 200,
          headers: {
            'Content-Type': res.headers.get('content-type') || 'image/jpeg',
            'Cache-Control': 'public, max-age=86400, immutable',
          },
        })
      }
    } catch {
      // try next candidate
    }
  }

  return new NextResponse('Not found', { status: 404 })
}
