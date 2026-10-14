# Lumen

A private, lightweight, ad-free, self-hosted YouTube frontend.

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

Lumen combines the speed of the YouTube Data API for public metadata with private video extraction powered by yt-dlp and optional Invidious backends. Built for personal and household use with zero ads and zero tracking.

## Features

- **Ad-free and tracker-free**: Direct video playback without advertisements or tracking scripts.
- **Shorts feed**: Dedicated vertical feed with keyboard navigation (Space to pause, Up/Down arrows to skip).
- **Local personalization**: Topic suggestions and watch state stored locally in the browser.
- **Search and channel views**: Channel banners, subscriber statistics, and video catalogs.
- **Worker pool and caching**: In-memory TTL caching and upstream concurrency limits (`YTDLP_CONCURRENCY`) to prevent rate limits.
- **Docker ready**: Production multi-stage Docker build or standalone Node.js deployment.

## Getting Started

### Using Docker

```bash
git clone https://github.com/NuzProjects/Lumen.git
cd Lumen
cp .env.example .env.local
docker compose up --build -d
```

Open [http://localhost:3000](http://localhost:3000). To stop:

```bash
docker compose down
```

### Local Development

Prerequisites: Node.js 22+, pnpm, and [yt-dlp](https://github.com/yt-dlp/yt-dlp) in your PATH (or `tools/yt-dlp.exe` on Windows).

```bash
pnpm install
pnpm dev -- --port 3000
```

## Configuration

Set these variables in `.env.local`:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `YOUTUBE_API_KEY` | None | YouTube Data API v3 key for search and channel metadata. |
| `INVIDIOUS_URL` | None | Custom Invidious server instance URL as an alternate stream provider. |
| `YTDLP_CONCURRENCY` | `3` | Maximum concurrent `yt-dlp` processes (1 to 4). |
| `YTDLP_COOKIES_FILE` | None | Path to exported cookies for bypassing bot checks. |
| `YTDLP_PROXY` | None | Proxy URL for `yt-dlp` requests. |

<details>
<summary><b>YouTube Data API Setup (Optional)</b></summary>

1. In the [Google Cloud Console](https://console.cloud.google.com/), enable the **YouTube Data API v3**.
2. Create an API key under **Credentials** and restrict it to the YouTube Data API v3.
3. Add `YOUTUBE_API_KEY=your_key` to `.env.local` and restart the server.
</details>

## Tech Stack

- [Next.js](https://nextjs.org/)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- [Invidious](https://github.com/iv-org/invidious)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com)

## License

This project is licensed under the [MIT License](LICENSE).
