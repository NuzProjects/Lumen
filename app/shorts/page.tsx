import { Suspense } from 'react'
import { SiteHeader } from '@/components/site-header'
import { ShortsFeed } from '@/components/shorts-feed'

export default function ShortsPage() {
  return <main className="shorts-page min-h-screen bg-background">
    <Suspense fallback={<div className="h-16" />}><SiteHeader /></Suspense>
    <div className="px-4 py-6"><ShortsFeed /></div>
  </main>
}
