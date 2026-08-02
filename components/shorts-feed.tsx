'use client'

import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { Loader2, Play, RefreshCw, Volume2, VolumeX } from 'lucide-react'
import { fetcher, thumbUrl, type VideoDetail, type VideoSummary } from '@/lib/types'

function ShortCard({ video, active, onEngagement }: { video: VideoSummary; active: boolean; onEngagement: (video: VideoSummary, watched: number) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)
  const [playing, setPlaying] = useState(false)
  const { data } = useSWR<VideoDetail>(active ? `/api/video/${video.id}` : null, fetcher, { revalidateOnFocus: false })

  useEffect(() => {
    const element = videoRef.current
    if (!element) return
    if (!active && !element.paused) element.pause()
  }, [active, data?.streamUrl])

  const togglePlay = () => {
    const element = videoRef.current
    if (!element) return
    if (element.paused) element.play().catch(() => undefined)
    else element.pause()
  }

  useEffect(() => {
    const onToggle = () => { if (active) togglePlay() }
    window.addEventListener('lumen:toggle-short', onToggle)
    return () => window.removeEventListener('lumen:toggle-short', onToggle)
  })

  return <article data-short-id={video.id} className="relative h-full snap-start overflow-hidden rounded-3xl bg-muted">
    {data?.streamUrl ? <video ref={videoRef} src={data.streamUrl} poster={thumbUrl(video.id)} muted={muted} loop playsInline preload="metadata" onPlay={() => setPlaying(true)} onPause={(event) => { setPlaying(false); onEngagement(video, event.currentTarget.currentTime) }} onClick={togglePlay} className="h-full w-full touch-pan-y cursor-pointer object-cover" /> : <><img src={thumbUrl(video.id)} alt="" className="h-full w-full scale-105 object-cover blur-sm" /><div className="absolute inset-0 grid place-items-center bg-black/25"><Loader2 className="h-8 w-8 animate-spin text-white" /></div></>}
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-4 pb-5 pt-24 text-white"><p className="line-clamp-2 text-sm font-semibold leading-snug">{video.title}</p><p className="mt-1 text-xs text-white/70">{video.channel}{video.viewCountText && ` · ${video.viewCountText}`}</p></div>
    {!playing && <div className="pointer-events-none absolute inset-0 grid place-items-center"><button onClick={togglePlay} className="pointer-events-auto grid h-14 w-14 cursor-pointer place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm" aria-label="Play this Short"><Play className="h-6 w-6 translate-x-px fill-current" /></button></div>}
    <button onClick={() => setMuted((value) => !value)} className="absolute right-3 top-3 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm" aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
  </article>
}

export function ShortsFeed() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState<string>()
  const [interests, setInterests] = useState<string[]>([])
  useEffect(() => {
    try { setInterests(JSON.parse(localStorage.getItem('lumen-short-interests') || '[]')) } catch { setInterests([]) }
  }, [])
  const feedUrl = interests.length ? `/api/shorts?topics=${encodeURIComponent(interests.join(','))}` : '/api/shorts'
  const { data, error, isLoading, mutate, isValidating } = useSWR<{ results: VideoSummary[] }>(feedUrl, fetcher, { revalidateOnFocus: false })
  const shorts = data?.results ?? []
  useEffect(() => {
    const root = scrollRef.current
    if (!root || !shorts.length) return
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (visible && visible.intersectionRatio >= 0.65) setActiveId(visible.target.getAttribute('data-short-id') || undefined)
    }, { root, threshold: [0.65, 0.8] })
    root.querySelectorAll('[data-short-id]').forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [shorts])
  useEffect(() => { if (shorts.length && !activeId) setActiveId(shorts[0].id) }, [shorts, activeId])
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.code === 'Space') { event.preventDefault(); window.dispatchEvent(new Event('lumen:toggle-short')) }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); scrollRef.current?.scrollBy({ top: (event.key === 'ArrowDown' ? 1 : -1) * scrollRef.current.clientHeight, behavior: 'smooth' }) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
  const rememberEngagement = (video: VideoSummary, watched: number) => {
    if (watched < 6) return
    const words = `${video.channel} ${video.title}`.replace(/[^\w\s-]/g, ' ').split(/\s+/).filter((word) => word.length >= 4 && !['shorts', 'official', 'video', 'with', 'from', 'this', 'that'].includes(word.toLowerCase())).slice(0, 3)
    if (!words.length) return
    setInterests((current) => {
      const next = [...new Set([...words, ...current])].slice(0, 8)
      localStorage.setItem('lumen-short-interests', JSON.stringify(next))
      return next
    })
  }
  if (isLoading) return <div className="mx-auto h-[70vh] max-w-sm animate-pulse rounded-3xl bg-muted" />
  if (error || !shorts.length) return <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center"><p className="text-sm text-muted-foreground">Shorts are taking a moment.</p><button onClick={() => mutate()} className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm"><RefreshCw className="h-4 w-4" />Try again</button></div>
  return <section className="mx-auto max-w-sm"><div className="mb-4 flex items-center justify-between"><h1 className="text-lg font-semibold">Shorts</h1><button onClick={() => mutate()} className="rounded-full p-2 text-muted-foreground hover:text-foreground" aria-label="Load different Shorts"><RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} /></button></div><div ref={scrollRef} className="touch-pan-y h-[calc(100vh-9rem)] snap-y snap-mandatory space-y-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{shorts.map((video) => <ShortCard key={video.id} video={video} active={video.id === activeId} onEngagement={rememberEngagement} />)}</div></section>
}
