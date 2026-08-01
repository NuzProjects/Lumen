# Lumen

Lumen is a private, self-hosted video discovery interface. It is set up for one person or a small private household: it keeps local results warm, runs up to three upstream `yt-dlp` workers, and uses the official YouTube Data API only for public channel artwork and metadata.

## Run with Docker (recommended)

1. Install Docker Desktop.
2. Copy the example configuration:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Edit `.env.local` and set `YOUTUBE_API_KEY` if you want fast official search plus channel banners, avatars, descriptions, and counts. `INVIDIOUS_URL` is optional and can point to your own Invidious server.
4. Start Lumen:

   ```powershell
   docker compose up --build -d
   ```

5. Open [http://localhost:3000](http://localhost:3000).

To stop it:

```powershell
docker compose down
```

## Run directly on Windows

1. Install Node.js 22+ and `yt-dlp`.
2. Create `.env.local` as above.
3. Install and start:

   ```powershell
   pnpm install --no-frozen-lockfile --ignore-scripts
   pnpm dev -- --port 3000
   ```

## Single-user performance

- For You refreshes frequently but rotates a cached candidate pool.
- Search, channel, and video metadata are cached in memory to avoid repeat upstream work.
- The upstream queue defaults to three active `yt-dlp` workers. Set `YTDLP_CONCURRENCY` to a value from 1 to 4 to tune it for your connection and rate-limit tolerance.
- Docker restarts the service automatically unless it is deliberately stopped.

## Create a YouTube Data API key

Lumen uses the YouTube Data API v3 for fast search and official public channel metadata. The key is free to create and use.

1. Open the [Google Cloud Console](https://console.cloud.google.com/), create or select a project, and enable **YouTube Data API v3** from **APIs & Services → Library**.
2. Go to **APIs & Services → Credentials → Create credentials → API key**.
3. Restrict the key to **YouTube Data API v3**. For a public deployment, also add your server IP address or hosting platform restrictions where available.
4. Add the key to `.env.local`:

   ```env
   YOUTUBE_API_KEY=your_key_here
   ```

5. Restart the app or run `docker compose up --build -d` again.
