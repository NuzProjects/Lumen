# Lumen

Lumen is a private, self-hosted video discovery interface. It is set up for one person or a small private household: it keeps local results warm, makes one upstream `yt-dlp` request at a time, and uses the official YouTube Data API only for public channel artwork and metadata.

## Run with Docker (recommended)

1. Install Docker Desktop.
2. Copy the example configuration:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Edit `.env.local` and set `YOUTUBE_API_KEY` if you want official channel banners, avatars, descriptions, and counts. `INVIDIOUS_URL` is optional and can point to your own Invidious server.
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
- The upstream queue is intentionally limited to one active `yt-dlp` process. This avoids rate-limit bursts on a small personal instance.
- Docker restarts the service automatically unless it is deliberately stopped.
