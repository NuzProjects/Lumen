'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Play } from 'lucide-react'
import { type VideoSummary, thumbUrl } from '@/lib/types'

export function VideoCard({ video }: { video: VideoSummary }) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const channelHref = video.channelId
    ? `/channel/${video.channelId}?name=${encodeURIComponent(video.channel)}`
    : `/search?q=${encodeURIComponent(video.channel)}`

  return (
    <article className="flex flex-col gap-3">
      <Link href={`/watch/${video.id}`} className="group relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-muted outline-none focus-visible:border-primary">
        {!errored && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl(video.id) || '/placeholder.svg'}
            alt=""
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
        {!loaded && <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted to-secondary" />}
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"><Play className="h-5 w-5 translate-x-px fill-current" /></span>
        </div>
        {video.durationText && <span className="absolute bottom-2 right-2 select-none rounded-full bg-black/75 px-2 py-1 text-[11px] font-semibold tracking-wide text-white tabular-nums">{video.durationText}</span>}
      </Link>

      <div className="flex flex-col gap-1">
        <Link href={`/watch/${video.id}`} className="line-clamp-2 text-pretty text-sm font-medium leading-snug text-foreground outline-none focus-visible:text-primary">
          {video.title}
        </Link>
        <Link href={channelHref} className="truncate text-xs text-muted-foreground hover:text-foreground">
          {video.channel}
        </Link>
        {(video.viewCountText || video.uploadedText) && (
          <p className="truncate text-xs text-muted-foreground/70">
            {video.viewCountText}
            {video.viewCountText && video.uploadedText && ' · '}
            {video.uploadedText && `Published ${video.uploadedText}`}
          </p>
        )}
      </div>
    </article>
  )
}

export function VideoCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="skeleton-shimmer aspect-video w-full rounded-xl bg-muted" />
      <div className="flex flex-col gap-2">
        <div className="skeleton-shimmer h-3.5 w-full rounded bg-muted" />
        <div className="skeleton-shimmer h-3.5 w-2/3 rounded bg-muted" />
        <div className="skeleton-shimmer h-3 w-1/3 rounded bg-muted/60" />
      </div>
    </div>
  )
}
