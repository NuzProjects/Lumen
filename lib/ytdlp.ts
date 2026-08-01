import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { getInvidiousVideo, searchInvidious } from '@/lib/invidious'
import { getYouTubeChannelProfile, searchYouTubeVideos } from '@/lib/youtube-api'
import { cached } from '@/lib/cache'

// yt-dlp may live in a few places depending on the environment.
const YTDLP_CANDIDATES = [
  process.env.YTDLP_PATH,
  process.platform === 'win32'
    ? join(process.cwd(), 'tools', 'yt-dlp.exe')
    : undefined,
  // On Windows, yt-dlp is normally installed as a command on PATH. The Unix
  // locations below do not exist and previously prevented that fallback.
  process.platform === 'win32' ? 'yt-dlp' : undefined,
  '/usr/local/bin/yt-dlp',
  '/usr/bin/yt-dlp',
  process.platform !== 'win32' ? 'yt-dlp' : undefined,
].filter(Boolean) as string[]

let cachedBin: string | null = null
// Allow a few workers for a self-hosted instance. Cached requests still bypass
// this queue, and the cap keeps upstream bursts under control.
const MAX_CONCURRENT_REQUESTS = Math.min(
  4,
  Math.max(1, Number.parseInt(process.env.YTDLP_CONCURRENCY || '3', 10) || 3),
)
let activeRequests = 0
const waitingRequests: Array<() => void> = []

async function acquireRequestSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests += 1
    return
  }

  await new Promise<void>((resolve) => waitingRequests.push(resolve))
}

function releaseRequestSlot(): void {
  const next = waitingRequests.shift()
  if (next) {
    next()
  } else {
    activeRequests -= 1
  }
}

async function resolveBin(): Promise<string> {
  if (cachedBin) return cachedBin
  // Just use the first candidate; spawn errors are handled by callers.
  cachedBin = YTDLP_CANDIDATES[0]
  return cachedBin
}

export interface RunOptions {
  timeoutMs?: number
  maxBuffer?: number
}

/**
 * Run yt-dlp with the given args and return stdout.
 * Rejects on non-zero exit or spawn failure.
 */
export async function runYtDlp(
  args: string[],
  opts: RunOptions = {},
): Promise<string> {
  const bin = await resolveBin()
  const { timeoutMs = 25_000, maxBuffer = 12 * 1024 * 1024 } = opts

  // Args applied to every call to improve reliability from datacenter IPs.
  const baseArgs = [
    '--no-warnings',
    '--no-playlist',
    '--no-check-certificate',
    '--extractor-args',
    'youtube:player_client=tv,web_safari,android',
    '--socket-timeout',
    '15',
  ]

  // Optional: supply a YouTube session to defeat bot detection on cloud IPs.
  // Set YTDLP_COOKIES_FILE to a path, or YTDLP_PROXY to a residential proxy URL.
  if (process.env.YTDLP_COOKIES_FILE) {
    baseArgs.push('--cookies', process.env.YTDLP_COOKIES_FILE)
  }
  if (process.env.YTDLP_PROXY) {
    baseArgs.push('--proxy', process.env.YTDLP_PROXY)
  }

  await acquireRequestSlot()

  try {
    return await new Promise((resolve, reject) => {
    const child = spawn(bin, [...baseArgs, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let killed = false
    let size = 0

    const timer = setTimeout(() => {
      killed = true
      child.kill('SIGKILL')
      reject(new Error('yt-dlp timed out'))
    }, timeoutMs)

    child.stdout.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > maxBuffer) {
        killed = true
        child.kill('SIGKILL')
        reject(new Error('yt-dlp output too large'))
        return
      }
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      if (!killed) reject(err)
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      if (killed) return
      if (code === 0) {
        resolve(stdout)
      } else {
        reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`))
      }
    })
    })
  } finally {
    releaseRequestSlot()
  }
}

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

function fmtDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return ''
  const s = Math.floor(seconds % 60)
  const m = Math.floor((seconds / 60) % 60)
  const h = Math.floor(seconds / 3600)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

function fmtViews(n: number | null): string {
  if (n == null) return ''
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B views`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K views`
  return `${n} views`
}

function fmtUploaded(
  ts: number | null,
  relative?: string,
  uploadDate?: string,
): string {
  if (relative) return relative
  const then = ts
    ? ts * 1000
    : uploadDate && /^\d{8}$/.test(uploadDate)
      ? Date.UTC(
          Number(uploadDate.slice(0, 4)),
          Number(uploadDate.slice(4, 6)) - 1,
          Number(uploadDate.slice(6, 8)),
        )
      : null
  if (!then) return ''
  const diff = Date.now() - then
  const day = 86_400_000
  if (diff < day) return 'today'
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))}w ago`
  if (diff < 365 * day) return `${Math.floor(diff / (30 * day))}mo ago`
  return `${Math.floor(diff / (365 * day))}y ago`
}

function bestThumb(entry: any): string {
  const id = entry.id
  // Prefer proxied YouTube thumbnail (i.ytimg is usually not blocked at schools,
  // but we proxy it anyway via the client for consistency).
  if (id) return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
  if (Array.isArray(entry.thumbnails) && entry.thumbnails.length) {
    return entry.thumbnails[entry.thumbnails.length - 1].url
  }
  return entry.thumbnail || ''
}

export function normalizeEntry(entry: any): VideoSummary {
  const duration =
    typeof entry.duration === 'number' ? entry.duration : null
  const viewCount =
    typeof entry.view_count === 'number' ? entry.view_count : null
  return {
    id: entry.id,
    title: entry.title || 'Untitled',
    channel: entry.channel || entry.uploader || 'Unknown channel',
    channelId: entry.channel_id || entry.uploader_id,
    duration,
    durationText: fmtDuration(duration),
    viewCount,
    viewCountText: fmtViews(viewCount),
    uploadedText: fmtUploaded(
      entry.timestamp ?? null,
      entry.upload_date_relative,
      entry.upload_date,
    ),
    thumbnail: bestThumb(entry),
  }
}

/**
 * Search YouTube via yt-dlp and return lightweight summaries.
 */
export async function search(
  query: string,
  limit = 20,
): Promise<VideoSummary[]> {
  const apiResults = await searchYouTubeVideos(query, limit)
  if (apiResults?.length) return apiResults

  const invidiousResults = await searchInvidious(query, limit)
  if (invidiousResults) return invidiousResults

  const out = await runYtDlp([
    `ytsearch${limit}:${query}`,
    '--dump-json',
  ])

  const results: VideoSummary[] = []
  for (const line of out.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const entry = JSON.parse(trimmed)
      if (entry && entry.id) results.push(normalizeEntry(entry))
    } catch {
      // ignore malformed lines
    }
  }
  return results
}

export interface StreamInfo extends VideoSummary {
  description: string
  streamUrl: string | null
  formats: { url: string; height: number | null; label: string }[]
}

export interface ChannelInfo {
  id: string
  name: string
  description: string
  avatar: string
  banner: string
  subscriberCount: number | null
  videoCount: number | null
  videos: VideoSummary[]
}

export async function getChannel(id: string, name?: string): Promise<ChannelInfo> {
  const apiProfile = await getYouTubeChannelProfile(id)
  const url = `https://www.youtube.com/channel/${id}/videos`
  const out = await runYtDlp([
    url,
    '--yes-playlist',
    '--playlist-end',
    '48',
    '--dump-single-json',
    '--flat-playlist',
  ], {
    timeoutMs: 60_000,
  })

  const data = JSON.parse(out)
  const channelName = apiProfile?.name || data.channel || data.uploader || name || 'Channel'
  const videos = Array.isArray(data.entries)
    ? data.entries.filter((entry: unknown) => Boolean(entry)).map(normalizeEntry)
    : []
  const channelVideos = (videos as VideoSummary[]).map((video) => ({
    ...video,
    channel: video.channel === 'Unknown channel' ? channelName : video.channel,
    channelId: video.channelId || id,
  }))
  const thumbnails = Array.isArray(data.thumbnails) ? data.thumbnails : []

  return {
    id,
    name: channelName,
    description: apiProfile?.description || data.description || '',
    avatar: apiProfile?.avatar || data.channel_thumbnail || data.thumbnail || thumbnails.at(-1)?.url || '',
    banner: apiProfile?.banner || data.banner || data.banner_url || '',
    subscriberCount: apiProfile?.subscriberCount ?? (typeof data.channel_follower_count === 'number'
        ? data.channel_follower_count
        : typeof data.uploader_follower_count === 'number'
          ? data.uploader_follower_count
          : null),
    videoCount: apiProfile?.videoCount ?? (typeof data.playlist_count === 'number'
        ? data.playlist_count
        : typeof data.channel_video_count === 'number'
          ? data.channel_video_count
          : null),
    videos: channelVideos.slice(0, 48),
  }
}

/**
 * Fetch full metadata + a playable progressive stream URL for a video id.
 */
export async function getVideo(id: string): Promise<StreamInfo> {
  return cached(`video:${id}`, 10 * 60_000, () => getVideoUncached(id))
}

async function getVideoUncached(id: string): Promise<StreamInfo> {
  const invidiousVideo = await getInvidiousVideo(id)
  if (invidiousVideo) return invidiousVideo

  const url = `https://www.youtube.com/watch?v=${id}`
  const out = await runYtDlp([url, '--dump-single-json'])
  const data = JSON.parse(out)

  const base = normalizeEntry(data)

  // Collect progressive (audio+video) mp4 formats that a <video> tag can play.
  const progressive = (data.formats || [])
    .filter(
      (f: any) =>
        f.url &&
        f.vcodec &&
        f.vcodec !== 'none' &&
        f.acodec &&
        f.acodec !== 'none' &&
        (f.ext === 'mp4' || f.protocol === 'https'),
    )
    .map((f: any) => ({
      url: f.url as string,
      height: (f.height as number) ?? null,
      label: f.height ? `${f.height}p` : f.format_note || 'auto',
    }))
    .sort((a: any, b: any) => (b.height ?? 0) - (a.height ?? 0))

  // Prefer 720p-ish progressive for reliability, else best available.
  const preferred =
    progressive.find((f: any) => f.height && f.height <= 720) ||
    progressive[0] ||
    null

  return {
    ...base,
    description: data.description || '',
    streamUrl: preferred?.url ?? null,
    formats: progressive,
  }
}
