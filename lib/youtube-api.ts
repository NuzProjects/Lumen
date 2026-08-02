export type YouTubeChannelProfile = {
  name: string
  description: string
  avatar: string
  banner: string
  subscriberCount: number | null
  videoCount: number | null
}

export type YouTubeVideoSummary = {
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

function formatViews(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K views`
  return `${count} views`
}

function relativeDate(date: string): string {
  const days = Math.max(0, Math.floor((Date.now() - Date.parse(date)) / 86_400_000))
  if (days === 0) return 'today'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function parseIsoDuration(value: string | undefined): number | null {
  if (!value) return null
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!match) return null
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0)
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return ''
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainder}`
}

export async function getPopularYouTubeVideos(
  limit = 24,
): Promise<YouTubeVideoSummary[] | null> {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) return null
  const url = new URL('https://www.googleapis.com/youtube/v3/videos')
  url.searchParams.set('part', 'snippet,contentDetails,statistics')
  url.searchParams.set('chart', 'mostPopular')
  url.searchParams.set('regionCode', 'US')
  url.searchParams.set('maxResults', String(Math.min(limit, 50)))
  url.searchParams.set('key', key)

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12_000) })
    if (!response.ok) return null
    const payload = (await response.json()) as {
      items?: Array<{
        id: string
        snippet?: { title?: string; channelTitle?: string; channelId?: string; publishedAt?: string; thumbnails?: { high?: { url?: string }; medium?: { url?: string } } }
        statistics?: { viewCount?: string }
      }>
    }
    const cutoff = Date.now() - 120 * 24 * 60 * 60 * 1000
    const videos = (payload.items || []).map((item) => {
      const views = Number(item.statistics?.viewCount) || 0
      return {
        id: item.id,
        title: item.snippet?.title || 'Untitled',
        channel: item.snippet?.channelTitle || 'Unknown channel',
        channelId: item.snippet?.channelId,
        duration: null,
        durationText: '',
        viewCount: views || null,
        viewCountText: views ? formatViews(views) : '',
        uploadedText: item.snippet?.publishedAt ? relativeDate(item.snippet.publishedAt) : '',
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || '',
      }
    })
    const recent = videos.filter((video, index) => {
      const published = payload.items?.[index]?.snippet?.publishedAt
      return published && Date.parse(published) >= cutoff
    })
    return recent.length >= 8 ? recent : videos
  } catch {
    return null
  }
}

export async function searchYouTubeVideos(
  query: string,
  limit: number,
): Promise<YouTubeVideoSummary[] | null> {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) return null
  const url = new URL('https://www.googleapis.com/youtube/v3/search')
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('type', 'video')
  url.searchParams.set('order', 'relevance')
  url.searchParams.set('maxResults', String(Math.min(limit, 50)))
  url.searchParams.set('q', query)
  url.searchParams.set('key', key)

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!response.ok) return null
    const payload = (await response.json()) as {
      items?: Array<{
        id?: { videoId?: string }
        snippet?: { title?: string; channelTitle?: string; channelId?: string; publishedAt?: string; thumbnails?: { high?: { url?: string }; medium?: { url?: string } } }
      }>
    }
    const results: YouTubeVideoSummary[] = []
    for (const item of payload.items || []) {
      const id = item.id?.videoId
      if (!id) continue
      results.push({
        id,
        title: item.snippet?.title || 'Untitled',
        channel: item.snippet?.channelTitle || 'Unknown channel',
        channelId: item.snippet?.channelId,
        duration: null,
        durationText: '',
        viewCount: null,
        viewCountText: '',
        uploadedText: item.snippet?.publishedAt ? relativeDate(item.snippet.publishedAt) : '',
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || '',
      })
    }
    return results
  } catch {
    return null
  }
}

const SHORTS_QUERIES = [
  'funny shorts', 'science shorts', 'gaming shorts', 'music shorts',
  'art shorts', 'animals shorts', 'coding shorts', 'sports shorts',
]

/** A fresh, randomly themed set of videos that YouTube classifies as short. */
export async function getRandomYouTubeShorts(limit = 18, interests: string[] = []): Promise<YouTubeVideoSummary[] | null> {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) return null

  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
  searchUrl.searchParams.set('part', 'snippet')
  searchUrl.searchParams.set('type', 'video')
  searchUrl.searchParams.set('videoDuration', 'short')
  // Recent view leaders are a better approximation of what is trending than
  // the default relevance ordering, which often surfaces older Shorts.
  searchUrl.searchParams.set('order', 'viewCount')
  searchUrl.searchParams.set('publishedAfter', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  searchUrl.searchParams.set('maxResults', String(Math.min(50, Math.max(limit * 2, 24))))
  const safeInterests = interests.filter((interest) => /^[\w\s-]{2,48}$/i.test(interest))
  searchUrl.searchParams.set('q', `${safeInterests[Math.floor(Math.random() * safeInterests.length)] || SHORTS_QUERIES[Math.floor(Math.random() * SHORTS_QUERIES.length)]} shorts`)
  searchUrl.searchParams.set('key', key)

  try {
    const response = await fetch(searchUrl, { signal: AbortSignal.timeout(12_000) })
    if (!response.ok) return null
    const payload = (await response.json()) as { items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string; channelId?: string; publishedAt?: string; thumbnails?: { high?: { url?: string }; medium?: { url?: string } } } }> }
    const ids = (payload.items || []).map((item) => item.id?.videoId).filter((id): id is string => Boolean(id))
    if (!ids.length) return []

    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
    detailsUrl.searchParams.set('part', 'contentDetails,statistics')
    detailsUrl.searchParams.set('id', ids.join(','))
    detailsUrl.searchParams.set('key', key)
    const detailsResponse = await fetch(detailsUrl, { signal: AbortSignal.timeout(12_000) })
    if (!detailsResponse.ok) return null
    const details = (await detailsResponse.json()) as { items?: Array<{ id: string; contentDetails?: { duration?: string }; statistics?: { viewCount?: string } }> }
    const byId = new Map((details.items || []).map((item) => [item.id, item]))

    return (payload.items || []).flatMap((item) => {
      const id = item.id?.videoId
      if (!id) return []
      const detail = byId.get(id)
      const duration = parseIsoDuration(detail?.contentDetails?.duration)
      // Shorts can now be up to three minutes; exclude normal videos returned by the broad API filter.
      if (duration == null || duration > 180) return []
      const views = Number(detail?.statistics?.viewCount) || null
      return [{
        id,
        title: item.snippet?.title || 'Untitled Short',
        channel: item.snippet?.channelTitle || 'Unknown channel',
        channelId: item.snippet?.channelId,
        duration,
        durationText: formatDuration(duration),
        viewCount: views,
        viewCountText: views ? formatViews(views) : '',
        uploadedText: item.snippet?.publishedAt ? relativeDate(item.snippet.publishedAt) : '',
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || '',
      }]
    }).slice(0, limit)
  } catch {
    return null
  }
}

export async function getYouTubeChannelProfile(
  id: string,
): Promise<YouTubeChannelProfile | null> {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) return null

  const url = new URL('https://www.googleapis.com/youtube/v3/channels')
  url.searchParams.set('part', 'snippet,statistics,brandingSettings')
  url.searchParams.set('id', id)
  url.searchParams.set('key', key)

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12_000) })
    if (!response.ok) return null
    const payload = (await response.json()) as {
      items?: Array<{
        snippet?: { title?: string; description?: string; thumbnails?: { high?: { url?: string }; medium?: { url?: string } } }
        statistics?: { subscriberCount?: string; videoCount?: string; hiddenSubscriberCount?: boolean }
        brandingSettings?: { image?: { bannerExternalUrl?: string } }
      }>
    }
    const channel = payload.items?.[0]
    if (!channel?.snippet?.title) return null

    return {
      name: channel.snippet.title,
      description: channel.snippet.description || '',
      avatar: channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.medium?.url || '',
      banner: channel.brandingSettings?.image?.bannerExternalUrl || '',
      subscriberCount: channel.statistics?.hiddenSubscriberCount ? null : Number(channel.statistics?.subscriberCount) || null,
      videoCount: Number(channel.statistics?.videoCount) || null,
    }
  } catch {
    return null
  }
}
