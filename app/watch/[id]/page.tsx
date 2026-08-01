import { Suspense } from 'react'
import { SiteHeader } from '@/components/site-header'
import { WatchView } from '@/components/watch-view'

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <main className="min-h-screen bg-background">
      <Suspense fallback={<div className="h-16 border-b border-border" />}>
        <SiteHeader />
      </Suspense>
      <WatchView id={id} />
    </main>
  )
}
