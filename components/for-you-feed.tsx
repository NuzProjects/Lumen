'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { AlertTriangle, RefreshCw, Search } from 'lucide-react'
import { CATEGORY_LIST, fetcher, type VideoSummary } from '@/lib/types'
import { VideoGrid, VideoGridSkeleton } from '@/components/video-grid'

const feedKey = (cat: string, topics: string[]) => `/api/feed?category=${encodeURIComponent(cat)}${topics.length ? `&topics=${encodeURIComponent(topics.join(','))}` : ''}`

export function ForYouFeed() {
  const [category, setCategory] = useState<string>('For You')
  const [hasSearchHistory, setHasSearchHistory] = useState<boolean | null>(null)
  const [profileTopics, setProfileTopics] = useState<string[]>([])
  useEffect(() => {
    try {
      const searches = JSON.parse(localStorage.getItem('lumen-search-history') || '[]') as string[]
      const watched = JSON.parse(localStorage.getItem('lumen-watch-history') || '[]') as Array<string | { channel?: string; title?: string }>
      const signals = watched.map((item) => typeof item === 'string' ? { channel: item, title: '' } : item)
      const channels = [...new Set(signals.map((signal) => signal.channel).filter((topic): topic is string => Boolean(topic)))].slice(0, 2)
      const subjects = [...new Set(signals.map((signal) => {
        const channelWords = new Set((signal.channel || '').toLowerCase().split(/\s+/))
        return (signal.title || '').split(/\s+/).filter((word) => word.length >= 4 && !channelWords.has(word.toLowerCase()) && !['official', 'video', 'with', 'from', 'this', 'that'].includes(word.toLowerCase())).slice(0, 6).join(' ')
      }).filter(Boolean))].slice(0, 2)
      const watchedTopics = [...channels, ...subjects]
      setHasSearchHistory(searches.length > 0 || watchedTopics.length > 0)
      setProfileTopics([...new Set([...watchedTopics, ...searches])].slice(0, 4))
    } catch {
      setHasSearchHistory(false)
    }
  }, [])
  const { data, error, isLoading, mutate, isValidating } = useSWR<{
    results: VideoSummary[]
  }>(feedKey(category, category === 'For You' ? profileTopics : []), fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60_000,
    keepPreviousData: true,
  })

  const videos = data?.results ?? []
  const showSkeleton = isLoading && videos.length === 0
  const showForYouOnboarding = category === 'For You' && hasSearchHistory === false

  return (
    <section>
      {/* category rail */}
      <div className="-mx-4 -mt-4 mb-6 border-b border-border/60 bg-background/80 px-4 py-3 sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORY_LIST.map((cat) => {
            const active = cat === category
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`h-9 shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-4 text-sm font-medium ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-secondary/50 text-muted-foreground'
                }`}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {showForYouOnboarding && (
        <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-muted-foreground"><Search className="h-5 w-5" /></span>
          <p className="text-base font-medium text-foreground">Start searching to build your personalization</p>
          <p className="max-w-sm text-sm text-muted-foreground">Your searches help Lumen tailor the For You feed to your interests.</p>
        </div>
      )}

      {!showForYouOnboarding && showSkeleton && <VideoGridSkeleton count={12} />}

      {!showForYouOnboarding && !showSkeleton && error && !videos.length && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <div>
            <p className="font-medium text-foreground">Videos are taking a moment</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              We&apos;re pacing requests to keep the feed reliable. Please try again in a few seconds.
            </p>
          </div>
          <button
            onClick={() => mutate()}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      )}

      {!showForYouOnboarding && !showSkeleton && videos.length > 0 && (
        <div
          className={`transition-opacity duration-300 ${
            isValidating ? 'opacity-60' : 'opacity-100'
          }`}
        >
          <VideoGrid videos={videos} />
        </div>
      )}

      {!showForYouOnboarding && !showSkeleton && !error && videos.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No videos found for this category.
        </p>
      )}

      {!showForYouOnboarding && isValidating && !isLoading && (
        <div className="mt-6 flex justify-center">
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Refreshing
          </span>
        </div>
      )}
    </section>
  )
}
