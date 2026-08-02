'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Clapperboard, Search, Play, X } from 'lucide-react'

export function SiteHeader() {
  const router = useRouter()
  const params = useSearchParams()
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setQ(params.get('q') ?? '')
  }, [params])

  function submit(e: FormEvent) {
    e.preventDefault()
    const term = q.trim()
    if (!term) return
    router.push(`/search?q=${encodeURIComponent(term)}`)
    inputRef.current?.blur()
  }

  return (
    <header className="sticky top-0 z-40 bg-transparent">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Link href="/" className="liquid-glass flex h-11 shrink-0 items-center gap-2 rounded-full px-3">
          <span className="flex h-8 w-8 items-center justify-center text-white" aria-hidden>
            <Play className="h-5 w-5 translate-x-px fill-current" />
          </span>
          <span className="hidden text-lg font-semibold tracking-tight text-foreground sm:block">
            Lumen
          </span>
        </Link>

        <form onSubmit={submit} className="flex flex-1 justify-center">
          <div className="liquid-glass relative flex w-full max-w-xl items-center rounded-full">
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="text"
              inputMode="search"
              enterKeyHint="search"
              placeholder="Search Videos..."
              aria-label="Search videos"
              className="h-11 w-full rounded-full bg-transparent pl-10 pr-12 text-base text-foreground placeholder:text-muted-foreground outline-none"
            />
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQ('')
                  inputRef.current?.focus()
                }}
                aria-label="Clear search"
                className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>

        <Link
          href="/shorts"
          aria-label="Browse Shorts"
          className="liquid-glass flex h-11 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-medium text-foreground"
        >
          <Clapperboard className="h-4 w-4" aria-hidden />
          <span className="hidden sm:block">Shorts</span>
        </Link>
      </div>
    </header>
  )
}
