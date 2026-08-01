export interface VideoSummary {
  id: string
  title: string
  channel: string
  channelId?: string
  duration: number | null
  durationText: string
  viewCount: number | null
  viewCountText: string
  uploadedText: string
  thumbnail: string
}

export interface VideoDetail extends VideoSummary {
  description: string
  streamUrl: string | null
  hasStream: boolean
  formats: { url: string; height: number | null; label: string }[]
}

export const CATEGORY_LIST = [
  'For You',
  'Study',
  'Science',
  'Coding',
  'History',
  'Math',
  'Gaming',
  'Music',
] as const

export function thumbUrl(id: string): string {
  return `/api/thumb/${id}`
}

export const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(body.error || 'Request failed') as Error & {
      status?: number
    }
    err.status = res.status
    throw err
  }
  return res.json()
}
