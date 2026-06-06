# MajiCast — Deployment Guide

## Architecture

| Service | Platform | URL pattern |
|---------|----------|-------------|
| Frontend (Next.js) | Vercel | `https://majicast.vercel.app` |
| Backend (FastAPI) | Railway | `https://majicast-backend.up.railway.app` |

---

## Step 1 — Deploy the Backend on Railway

1. Go to **[railway.app](https://railway.app)** → **New Project** → **Deploy from GitHub repo**
2. Select the **MajiCast** repository
3. Railway auto-detects `railway.toml` and uses `Dockerfile.backend`
4. Wait for the build to complete (~3–5 minutes, models are large)
5. Go to **Settings → Networking → Generate Domain** to get a public URL
6. Test the health endpoint:
   ```
   curl https://<your-service>.up.railway.app/health
   # Expected: {"status":"ok"}
   ```
7. **Copy the Railway domain** — you'll need it in Step 2

---

## Step 2 — Deploy the Frontend on Vercel

1. Go to **[vercel.com](https://vercel.com)** → **Add New Project** → Import **MajiCast** from GitHub
2. **⚠️ CRITICAL — Set Root Directory to `web`** before deploying:
   - In the Vercel project configuration screen, expand **Root Directory**
   - Type `web` and confirm
3. Add the following **Environment Variables** in Vercel:

   | Variable | Value |
   |----------|-------|
   | `NEXT_PUBLIC_INFERENCE_API_URL` | `https://<your-railway-domain>` |
   | `INFERENCE_API_URL` | `https://<your-railway-domain>` |
   | `GEMINI_API_KEY` | Your Gemini API key |

4. Click **Deploy**
5. Once live, test:
   - `/` — Home page loads
   - `/analysis` — Map and insights populated with data
   - `/sensor` — Sensor form calls backend successfully

---

## Step 3 — Update Backend CORS (after Vercel URL is known)

Once Vercel assigns your production URL (e.g. `https://majicast.vercel.app`), update `inference/main.py`:

```python
allow_origins=[
    "http://localhost:3000",
    "http://localhost:3001",
    "https://majicast.vercel.app",   # ← update with your actual Vercel URL
    ...
],
```

The `allow_origin_regex` already covers all `*.vercel.app` preview deployments.

---

## Auto-deploy on push

Both services auto-deploy when you push to the connected GitHub branch:
- **Vercel** → rebuilds frontend (Next.js)
- **Railway** → rebuilds backend (Docker)

---

## Local Docker (no change)

Your existing `docker compose up --build` workflow still works as before.
The only difference is the `HOST_IP` variable which controls the LAN-accessible URL.

```bash
# Copy .env.example and fill in your values
cp .env.example .env
# Edit HOST_IP to your machine's LAN IP
docker compose up --build
```
