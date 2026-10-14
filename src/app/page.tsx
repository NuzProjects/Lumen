import { Suspense } from 'react'
import { SiteHeader } from '@/components/site-header'
import { ForYouFeed } from '@/components/for-you-feed'

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      <Suspense fallback={<div className="h-16 border-b border-border" />}>
        <SiteHeader />
      </Suspense>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <ForYouFeed />
      </div>
    </main>
  )
}
