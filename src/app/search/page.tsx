import { Suspense } from 'react'
import { SiteHeader } from '@/components/site-header'
import { SearchResults } from '@/components/search-results'
import { VideoGridSkeleton } from '@/components/video-grid'

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-background">
      <Suspense fallback={<div className="h-16 border-b border-border" />}>
        <SiteHeader />
      </Suspense>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Suspense fallback={<VideoGridSkeleton count={8} />}>
          <SearchResults />
        </Suspense>
      </div>
    </main>
  )
}
