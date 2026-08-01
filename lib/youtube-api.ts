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
