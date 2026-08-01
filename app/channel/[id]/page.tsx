import { Suspense } from 'react'
import { SiteHeader } from '@/components/site-header'
import { ChannelView } from '@/components/channel-view'

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ name?: string }>
}) {
  const { id } = await params
  const { name = 'Channel' } = await searchParams
  return (
    <main className="min-h-screen bg-background">
      <Suspense fallback={<div className="h-16 border-b border-border" />}><SiteHeader /></Suspense>
      <ChannelView id={id} name={name} />
    </main>
  )
}
