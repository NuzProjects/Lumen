import type { StreamInfo, VideoSummary } from '@/lib/ytdlp'

const baseUrl = process.env.INVIDIOUS_URL?.replace(/\/$/, '')

type InvidiousVideo = {
  type?: string
  videoId?: string
  title?: string
  author?: string
  authorId?: string
  lengthSeconds?: number
  viewCount?: number
  published?: number
  publishedText?: string
  description?: string
  videoThumbnails?: { url: string }[]
  formatStreams?: { url?: string; qualityLabel?: string; quality?: string }[]
}

function formatDuration(seconds?: number): string {
  if (!seconds) return ''
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const remaining = String(seconds % 60).padStart(2, '0')
  return hours ? `${hours}:${String(minutes % 60).padStart(2, '0')}:${remaining}` : `${minutes}:${remaining}`
}

function formatViews(count?: number): string {
  if (count == null) return ''
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K views`
  return `${count} views`
}

function summary(video: InvidiousVideo): VideoSummary | null {
  if (!video.videoId) return null
  return {
    id: video.videoId,
    title: video.title || 'Untitled',
    channel: video.author || 'Unknown channel',
    channelId: video.authorId,
    duration: video.lengthSeconds ?? null,
    durationText: formatDuration(video.lengthSeconds),
    viewCount: video.viewCount ?? null,
    viewCountText: formatViews(video.viewCount),
    uploadedText: video.publishedText || '',
    thumbnail: video.videoThumbnails?.at(-1)?.url || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
  }
}

async function request<T>(path: string): Promise<T | null> {
  if (!baseUrl) return null
  try {
    const response = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(12_000) })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

export async function searchInvidious(query: string, limit: number): Promise<VideoSummary[] | null> {
  const videos = await request<InvidiousVideo[]>(`/api/v1/search?q=${encodeURIComponent(query)}&type=video`)
  if (!videos) return null
  return videos.map(summary).filter((video): video is VideoSummary => Boolean(video)).slice(0, limit)
}

export async function getInvidiousVideo(id: string): Promise<StreamInfo | null> {
  const video = await request<InvidiousVideo>(`/api/v1/videos/${encodeURIComponent(id)}`)
  const base = video && summary(video)
  if (!video || !base) return null

  const formats = (video.formatStreams || [])
    .filter((format): format is Required<Pick<typeof format, 'url'>> & typeof format => Boolean(format.url))
    .map((format) => ({ url: format.url, height: Number.parseInt(format.qualityLabel || format.quality || '', 10) || null, label: format.qualityLabel || format.quality || 'auto' }))
  const streamUrl = formats.find((format) => format.height && format.height <= 720)?.url || formats[0]?.url || null

  return {
    ...base,
    description: video.description || '',
    streamUrl,
    formats,
    isShort: false,
  }
}
