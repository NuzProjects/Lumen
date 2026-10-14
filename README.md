<div align="center">

  # Lumen

  ### The open-source, ad-free, self-hosted YouTube frontend!

  <p>
    <img src="https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  </p>

  A private, lightweight video discovery and streaming interface designed for single users or private households. No ads, no trackers, and complete control over your viewing experience.

</div>

---

## Features

- **Ad-free & Tracker-free** — Stream videos directly with zero advertisements or tracking scripts.
- **Dedicated Shorts Feed** — Vertical swipeable shorts with keyboard controls (Space to toggle, Up/Down arrows to navigate).
- **Privacy-Focused Personalization** — Topic suggestions and watch state stored locally in your browser rather than in the cloud.
- **Fast Search & Channel Hubs** — Quick channel metadata, subscriber statistics, banners, and full video catalogs.
- **Worker Pool & Caching** — In-memory TTL cache and configurable concurrency limits (`YTDLP_CONCURRENCY`) to prevent upstream rate-limiting.
- **Docker & Windows Support** — Multi-stage Docker builds for production deployment, or run directly via Node.js.

---

## Getting Started

### Run with Docker (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/NuzProjects/Lumen.git
   cd Lumen
   ```

2. Copy the sample environment file:
   ```bash
   cp .env.example .env.local
   ```
   *(On Windows PowerShell: `Copy-Item .env.example .env.local`)*

3. *(Optional)* Add your `YOUTUBE_API_KEY` to `.env.local` for official channel banners, subscriber counts, and high-speed search.

4. Build and start the container:
   ```bash
   docker compose -f docker/compose.yaml up --build -d
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

To stop the container:
```bash
docker compose -f docker/compose.yaml down
```

---

### Run Directly with Node.js & pnpm

1. Prerequisites:
   - Node.js 22+
   - pnpm (`npm install -g pnpm`)
   - [yt-dlp](https://github.com/yt-dlp/yt-dlp) installed and available in PATH (or placed in `tools/yt-dlp.exe` on Windows)

2. Configure environment:
   ```bash
   cp .env.example .env.local
   ```

3. Install dependencies and start the development server:
   ```bash
   pnpm install
   pnpm dev -- --port 3000
   ```

---

<details>
<summary><b>YouTube Data API Setup (Optional)</b></summary>
<br>

Lumen can use the free YouTube Data API v3 for high-speed search and official channel statistics:

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. Enable **YouTube Data API v3** from **APIs & Services → Library**.
3. Navigate to **APIs & Services → Credentials → Create credentials → API key**.
4. Restrict the key to **YouTube Data API v3** (and restrict by server IP address if deployed publicly).
5. Add the key to `.env.local`:
   ```env
   YOUTUBE_API_KEY=your_api_key_here
   ```
6. Restart the application.

</details>

---

## Configuration

| Variable | Default | Description |
| :--- | :--- | :--- |
| `YOUTUBE_API_KEY` | *None* | YouTube Data API v3 key for fast search and channel metadata. |
| `INVIDIOUS_URL` | *None* | Custom Invidious server instance URL to act as an alternate stream provider. |
| `YTDLP_CONCURRENCY` | `3` | Maximum concurrent `yt-dlp` processes running simultaneously (1–4). |
| `YTDLP_COOKIES_FILE` | *None* | Path to export cookies for bypassing bot detection. |
| `YTDLP_PROXY` | *None* | Proxy URL for `yt-dlp` requests. |

---

## License

This project is open-source and available under the [MIT License](LICENSE).
