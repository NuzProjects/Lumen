'use client'

import { useEffect, useRef, useState } from 'react'
import { type VideoSummary } from '@/lib/types'
import { VideoCard, VideoCardSkeleton } from '@/components/video-card'

const BATCH_SIZE = 8

export function VideoGrid({ videos }: { videos: VideoSummary[] }) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasMore = visibleCount < videos.length
  const visibleVideos = videos.slice(0, visibleCount)

  useEffect(() => {
    setVisibleCount(BATCH_SIZE)
    setLoadingMore(false)
  }, [videos])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || loadingMore) return
        setLoadingMore(true)
        timerRef.current = setTimeout(() => {
          setVisibleCount((count) => Math.min(count + BATCH_SIZE, videos.length))
          setLoadingMore(false)
        }, 60)
      },
      { rootMargin: '900px' },
    )
    observer.observe(sentinel)
    return () => {
      observer.disconnect()
    }
  }, [hasMore, loadingMore, videos.length])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  return (
    <>
      <div className="grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleVideos.map((video, index) => (
          <div
            key={video.id}
            className="animate-fade-rise"
            style={{ animationDelay: `${Math.min(index % BATCH_SIZE, 7) * 45}ms` }}
          >
            <VideoCard video={video} />
          </div>
        ))}
        {hasMore && Array.from({ length: Math.min(BATCH_SIZE, videos.length - visibleCount) }).map((_, index) => (
          <VideoCardSkeleton key={`loading-${index}`} />
        ))}
      </div>
      {hasMore && <div ref={sentinelRef} className="h-px" aria-hidden />}
    </>
  )
}

export function VideoGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => <VideoCardSkeleton key={index} />)}
    </div>
  )
}
