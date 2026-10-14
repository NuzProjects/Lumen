'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import useSWR from 'swr'
import { AlertTriangle, RefreshCw, SearchX } from 'lucide-react'
import { fetcher, type VideoSummary } from '@/lib/types'
import { VideoGrid, VideoGridSkeleton } from '@/components/video-grid'

export function SearchResults() {
  const params = useSearchParams()
  const q = params.get('q')?.trim() ?? ''
  const { data, error, isLoading, mutate } = useSWR<{ results: VideoSummary[] }>(
    q ? `/api/search?q=${encodeURIComponent(q)}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  )

  const videos = data?.results ?? []
  useEffect(() => {
    if (!q) return
    try {
      const existing = JSON.parse(localStorage.getItem('lumen-search-history') || '[]') as string[]
      localStorage.setItem('lumen-search-history', JSON.stringify([q, ...existing.filter((item) => item.toLowerCase() !== q.toLowerCase())].slice(0, 20)))
    } catch {
      localStorage.setItem('lumen-search-history', JSON.stringify([q]))
    }
  }, [q])
  const channels = Array.from(
    new Map(
      videos.map((video) => [
        video.channelId || video.channel,
        { id: video.channelId, name: video.channel },
      ]),
    ).values(),
  ).slice(0, 8)

  if (!q) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <SearchX className="h-8 w-8 text-muted-foreground" />
        <p className="text-base font-medium text-foreground">Start searching to build your personalization</p>
        <p className="max-w-sm text-sm text-muted-foreground">Searches help Lumen find more videos you&apos;ll want to watch.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold tracking-tight text-foreground">
        Results for <span className="text-primary">&ldquo;{q}&rdquo;</span>
      </h1>

      {isLoading && <VideoGridSkeleton count={8} />}

      {!isLoading && error && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <div>
            <p className="font-medium text-foreground">Search is briefly paused</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              We&apos;re pacing requests to keep searches available for everyone. Please try again in a few seconds.
            </p>
          </div>
          <button
            onClick={() => mutate()}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      )}

      {!isLoading && !error && videos.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <SearchX className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No results found for &ldquo;{q}&rdquo;.</p>
        </div>
      )}

      {!isLoading && !error && videos.length > 0 && (
        <>
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Browse channels</h2>
            <div className="flex flex-wrap gap-2">
              {channels.map((channel) => (
                <Link
                  key={channel.id || channel.name}
                  href={
                    channel.id
                      ? `/channel/${channel.id}?name=${encodeURIComponent(channel.name)}`
                      : `/search?q=${encodeURIComponent(channel.name)}`
                  }
                  className="rounded-full border border-border bg-secondary/50 px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  {channel.name}
                </Link>
              ))}
            </div>
          </section>
          <VideoGrid videos={videos} />
        </>
      )}
    </div>
  )
}
