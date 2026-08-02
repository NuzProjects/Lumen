'use client'

import { useRef, useState } from 'react'
import { AlertTriangle, Loader2, Maximize, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { type VideoDetail, thumbUrl } from '@/lib/types'

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00'
  const total = Math.floor(seconds)
  const minutes = Math.floor(total / 60)
  const remainder = String(total % 60).padStart(2, '0')
  return `${minutes}:${remainder}`
}

export function VideoPlayer({ video }: { video: VideoDetail }) {
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [showVolume, setShowVolume] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [ended, setEnded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<HTMLDivElement>(null)
  const noStream = !video.hasStream || !video.streamUrl

  const togglePlayback = async () => {
    const element = videoRef.current
    if (!element) return
    if (element.paused) await element.play()
    else element.pause()
  }

  const toggleMuted = () => {
    const element = videoRef.current
    if (!element) return
    element.muted = !element.muted
    setMuted(element.muted)
  }

  const changeVolume = (value: number) => {
    const element = videoRef.current
    if (!element) return
    element.volume = value
    element.muted = value === 0
    setVolume(value)
    setMuted(value === 0)
  }

  const seek = (time: number) => {
    const element = videoRef.current
    if (!element) return
    element.currentTime = time
    setCurrentTime(time)
  }

  const enterFullscreen = () => {
    playerRef.current?.requestFullscreen?.()
  }

  const replay = async () => {
    const element = videoRef.current
    if (!element) return
    element.currentTime = 0
    setEnded(false)
    await element.play()
  }

  return (
    <div
      ref={playerRef}
      className={`relative w-full overflow-hidden rounded-2xl border border-border bg-black ${
        video.isShort ? 'mx-auto aspect-[9/16] max-w-sm' : 'aspect-video'
      }`}
    >
      {!ready && !noStream && !failed && (
        <div className="absolute inset-0 z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbUrl(video.id) || '/placeholder.svg'} alt="" className="h-full w-full scale-105 object-cover blur-md" />
          <div className="absolute inset-0 flex items-center justify-center bg-background/30">
            <Loader2 className="h-9 w-9 animate-spin text-primary" aria-label="Loading" />
          </div>
        </div>
      )}

      {!noStream && !failed && (
        <>
          <video
            ref={videoRef}
            key={video.id}
            autoPlay
            playsInline
            poster={thumbUrl(video.id)}
            onCanPlay={() => setReady(true)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => {
              setPlaying(false)
              setEnded(true)
            }}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
            onError={() => setFailed(true)}
            onClick={togglePlayback}
            crossOrigin="anonymous"
            className="h-full w-full cursor-pointer bg-black"
          >
            <source src={video.streamUrl!} type="video/mp4" />
          </video>

          {ready && !ended && (
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-4 pb-4 pt-12">
              <input
                aria-label="Seek"
                type="range"
                min="0"
                max={duration || 0}
                step="0.1"
                value={Math.min(currentTime, duration || 0)}
                onChange={(event) => seek(Number(event.target.value))}
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/30 accent-primary"
                style={{
                  background: `linear-gradient(to right, var(--primary) ${(currentTime / (duration || 1)) * 100}%, rgb(255 255 255 / 0.3) ${(currentTime / (duration || 1)) * 100}%)`,
                }}
              />
              <div className="flex items-center gap-3 text-white">
                <button type="button" onClick={togglePlayback} aria-label={playing ? 'Pause' : 'Play'} className="grid h-8 w-8 cursor-pointer place-items-center rounded-full hover:bg-white/10">
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>
                <div
                  className="flex items-center"
                  onMouseEnter={() => setShowVolume(true)}
                  onMouseLeave={() => setShowVolume(false)}
                >
                  <button type="button" onClick={toggleMuted} aria-label={muted ? 'Unmute' : 'Mute'} className="grid h-8 w-8 cursor-pointer place-items-center rounded-full hover:bg-white/10">
                    {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>
                  <input
                    aria-label="Volume"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={muted ? 0 : volume}
                    onChange={(event) => changeVolume(Number(event.target.value))}
                    className={`h-1 cursor-pointer appearance-none rounded-full bg-white/30 accent-primary transition-all duration-300 ease-out ${
                      showVolume ? 'ml-1 w-20 opacity-100' : 'w-0 opacity-0'
                    }`}
                    style={{
                      background: `linear-gradient(to right, var(--primary) ${(muted ? 0 : volume) * 100}%, rgb(255 255 255 / 0.3) ${(muted ? 0 : volume) * 100}%)`,
                    }}
                  />
                </div>
                <span className="select-none text-xs tabular-nums text-white/85">{formatTime(currentTime)} / {formatTime(duration)}</span>
                <button type="button" onClick={enterFullscreen} aria-label="Fullscreen" className="ml-auto grid h-8 w-8 cursor-pointer place-items-center rounded-full hover:bg-white/10">
                  <Maximize className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
          {ready && ended && (
            <button
              type="button"
              onClick={replay}
              aria-label="Replay video"
              className="absolute inset-0 z-10 grid cursor-pointer place-items-center overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbUrl(video.id) || '/placeholder.svg'} alt="" className="absolute h-full w-full scale-105 object-cover blur-md" />
              <span className="relative grid h-14 w-14 place-items-center rounded-full bg-white text-black shadow-xl">
                <Play className="h-6 w-6 translate-x-px fill-current" />
              </span>
            </button>
          )}
        </>
      )}

      {(noStream || failed) && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15 text-destructive"><AlertTriangle className="h-7 w-7" /></span>
          <div>
            <p className="text-base font-medium text-foreground">This video couldn&apos;t be streamed</p>
            <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">YouTube is blocking playback requests from this server&apos;s network. Streaming works reliably once the proxy runs on a network YouTube trusts.</p>
          </div>
        </div>
      )}
    </div>
  )
}
