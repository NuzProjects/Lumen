'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { AlertTriangle, Search } from 'lucide-react'
import { fetcher, type VideoSummary } from '@/lib/types'
import { VideoGrid, VideoGridSkeleton } from '@/components/video-grid'

type Channel = {
  id: string
  name: string
  description: string
  avatar: string
  banner: string
  subscriberCount: number | null
  videoCount: number | null
  videos: VideoSummary[]
}

function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return String(count)
}

export function ChannelView({ id, name }: { id: string; name: string }) {
  const [query, setQuery] = useState('')
  const { data, error, isLoading } = useSWR<Channel>(
    `/api/channel/${id}?name=${encodeURIComponent(name)}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 15 * 60_000 },
  )
  const videos = useMemo(
    () => (data?.videos ?? []).filter((video) => video.title.toLowerCase().includes(query.trim().toLowerCase())),
    [data?.videos, query],
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {isLoading && <ChannelSkeleton />}

      {!isLoading && error && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <AlertTriangle className="h-7 w-7 text-muted-foreground" />
          <p className="font-medium text-foreground">This channel is unavailable right now</p>
          <p className="text-sm text-muted-foreground">Please try again in a moment.</p>
        </div>
      )}

      {!isLoading && data && (
        <>
          <header className="mb-8 overflow-hidden rounded-2xl border border-border bg-card">
            {data.banner && (
              <div className="h-40 sm:h-52">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.banner}
                  alt=""
                  fetchPriority="high"
                  className="h-full w-full object-cover object-center"
                />
              </div>
            )}
            <div className={`relative px-5 pb-6 sm:px-7 ${data.banner ? '' : 'pt-6'}`}>
              <span className={`${data.banner ? '-mt-10 sm:-mt-12' : ''} grid h-20 w-20 place-items-center overflow-hidden rounded-full border-4 border-card bg-secondary text-3xl font-semibold text-foreground sm:h-24 sm:w-24`}>
                {data.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  data.name.slice(0, 1).toUpperCase()
                )}
              </span>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{data.name}</h1>
              {data.subscriberCount != null && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatCount(data.subscriberCount)} subscribers
                </p>
              )}
              {data.description && <ChannelDescription text={data.description} />}
            </div>
          </header>

          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="text-lg font-semibold text-foreground">Videos</h2>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search this channel"
                className="h-10 w-full rounded-full border border-border bg-secondary/60 pl-9 pr-4 text-sm text-foreground outline-none"
              />
            </div>
          </div>

          {videos.length > 0 ? <VideoGrid videos={videos} /> : <p className="py-12 text-sm text-muted-foreground">No matching videos were found.</p>}
        </>
      )}
    </div>
  )
}

function ChannelDescription({ text }: { text: string }) {
  return (
    <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
      {text.split(/(https?:\/\/[^\s]+)/g).map((part, index) =>
        /^https?:\/\//.test(part) ? (
          <a key={`${part}-${index}`} href={part} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">{part}</a>
        ) : part,
      )}
    </p>
  )
}

function ChannelSkeleton() {
  return (
    <div>
      <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="skeleton-shimmer h-40 bg-muted sm:h-52" />
        <div className="px-5 pb-6 sm:px-7">
          <div className="skeleton-shimmer -mt-10 h-20 w-20 rounded-full border-4 border-card bg-muted sm:-mt-12 sm:h-24 sm:w-24" />
          <div className="skeleton-shimmer mt-4 h-7 w-48 rounded bg-muted" />
          <div className="skeleton-shimmer mt-3 h-4 w-28 rounded bg-muted/70" />
          <div className="skeleton-shimmer mt-5 h-4 max-w-2xl rounded bg-muted/70" />
          <div className="skeleton-shimmer mt-2 h-4 w-4/5 max-w-xl rounded bg-muted/70" />
        </div>
      </div>
      <div className="mb-6 flex items-center justify-between">
        <div className="skeleton-shimmer h-6 w-20 rounded bg-muted" />
        <div className="skeleton-shimmer h-10 w-56 rounded-full bg-muted" />
      </div>
      <VideoGridSkeleton count={8} />
    </div>
  )
}
