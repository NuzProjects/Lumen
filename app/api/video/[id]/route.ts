import { type NextRequest, NextResponse } from 'next/server'
import { getVideo } from '@/lib/ytdlp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ID_RE = /^[a-zA-Z0-9_-]{6,20}$/

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  if (!ID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid video id' }, { status: 400 })
  }

  try {
    const video = await getVideo(id)
    // Don't ship raw googlevideo urls to the client — route through our proxy.
    const playable = video.streamUrl ? `/api/stream/${id}` : null
    return NextResponse.json({
      ...video,
      streamUrl: playable,
      hasStream: Boolean(video.streamUrl),
    })
  } catch (err) {
    console.log('[v0] video error:', (err as Error).message)
    return NextResponse.json(
      { error: 'Could not load video', detail: (err as Error).message },
      { status: 502 },
    )
  }
}
