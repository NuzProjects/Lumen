'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import useSWR from 'swr'
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react'
import { fetcher, type VideoDetail } from '@/lib/types'
import { VideoPlayer } from '@/components/video-player'

export function WatchView({ id }: { id: string }) {
  const { data, error, isLoading } = useSWR<VideoDetail>(
    `/api/video/${id}`,
    fetcher,
    { revalidateOnFocus: false },
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Link
        href="/"
        className="liquid-glass mb-4 inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </Link>

      <div className="mx-auto max-w-4xl">
        <div className="min-w-0">
          {isLoading && (
            <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-border bg-card">
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading video" />
              </span>
            </div>
          )}

          {!isLoading && error && (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card px-6 text-center">
              <AlertTriangle className="h-7 w-7 text-destructive" />
              <p className="text-sm text-muted-foreground">
                Couldn&apos;t load this video. It may be unavailable or the
                server is rate-limited.
              </p>
            </div>
          )}

          {!isLoading && data && <VideoPlayer video={data} />}

          {data && (
            <div className="mt-5">
              <h1 className="text-pretty text-xl font-semibold leading-snug tracking-tight text-foreground">
                {data.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <Link
                  href={
                    data.channelId
                      ? `/channel/${data.channelId}?name=${encodeURIComponent(data.channel)}`
                      : `/search?q=${encodeURIComponent(data.channel)}`
                  }
                  className="font-medium text-foreground hover:text-primary"
                >
                  {data.channel}
                </Link>
                {data.viewCountText && <span>{data.viewCountText}</span>}
                {data.uploadedText && <span>{data.uploadedText}</span>}
              </div>

              {data.description && (
                <div className="mt-4">
                  <Description text={data.description} />
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

function Description({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const contentRef = useRef<HTMLParagraphElement>(null)
  const [height, setHeight] = useState('4.5rem')

  const toggle = () => {
    const nextExpanded = !expanded
    setHeight(
      nextExpanded && contentRef.current
        ? `${contentRef.current.scrollHeight}px`
        : '4.5rem',
    )
    setExpanded(nextExpanded)
  }

  return (
    <div>
      <p
        ref={contentRef}
        className="overflow-hidden whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground transition-[max-height] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ maxHeight: height }}
      >
        {text.split(/(https?:\/\/[^\s]+)/g).map((part, index) =>
          /^https?:\/\//.test(part) ? (
            <a
              key={`${part}-${index}`}
              href={part}
              target="_blank"
              rel="noreferrer"
              className="break-all text-primary hover:underline"
            >
              {part}
            </a>
          ) : (
            part
          ),
        )}
      </p>
      {text.length > 180 && (
        <button
          onClick={toggle}
          aria-expanded={expanded}
          className="mt-2 text-sm font-medium text-primary"
        >
          {expanded ? 'Show Less' : 'Show More'}
        </button>
      )}
    </div>
  )
}
