# MajiCast — Decoupled Deployment Guide

This project is configured for a decoupled deployment:
* **Frontend (Next.js)**: Deployed to **Vercel** from the `web/` subdirectory.
* **Backend (FastAPI)**: Deployed to **Render** from the `inference/` subdirectory.

---

## Step 1 — Deploy the Backend on Render

1. Create a **Render** account at **[render.com](https://render.com/)**.
2. Click **New +** → **Blueprint** to import the repository (or click **Web Service** and choose Python runtime).
3. If using Blueprint:
   - Render will read [inference/render.yaml](file:///c:/Users/ngang/OneDrive/Desktop/Projects/Data%20Science/MajiCast/inference/render.yaml) automatically.
4. If setting up manually as a **Web Service**:
   - **Repository Root Directory**: Set to `inference` (very important).
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Python Version**: Render will automatically pick up Python `3.11` from the [inference/.python-version](file:///c:/Users/ngang/OneDrive/Desktop/Projects/Data%20Science/MajiCast/inference/.python-version) file.
5. Once deployed, note your service URL (e.g. `https://majicast-backend.onrender.com`).
6. Test the liveness probe:
   ```bash
   curl https://<your-render-service>.onrender.com/health
   # Expected: {"status":"ok"}
   ```

---

## Step 2 — Deploy the Frontend on Vercel

1. Import the repository into **[vercel.com](https://vercel.com/)**.
2. Vercel will auto-detect the root-level [vercel.json](file:///c:/Users/ngang/OneDrive/Desktop/Projects/Data%20Science/MajiCast/vercel.json) config, which configures Next.js inside the `web/` directory.
3. In **Settings → Environment Variables**, add the following values:

   | Variable | Value | Description |
   |----------|-------|-------------|
   | `NEXT_PUBLIC_INFERENCE_API_URL` | `https://<your-render-service>.onrender.com` | Public backend URL for browser direct calls. |
   | `INFERENCE_API_URL` | `https://<your-render-service>.onrender.com` | Server-to-server Next.js backend proxy URL. |
   | `GEMINI_API_KEY` | *Your Gemini API key* | Secret key for citizen report NLP classification. |

4. Click **Deploy**.

---

## Step 3 — Verification

Once deployed, verify:
* **Dashboard (`/`)**: Page loads and charts render.
* **Map and Analysis (`/analysis`)**: Correctly retrieves processed datasets from Next.js serverless functions.
* **Sensor Anomalies (`/sensor`)**: Makes calls to the Render service.
* **Citizen Reports (`/nlp`)**: The classifier runs using Gemini API on the Vercel serverless functions.

---

## Local Development

You can run both services locally on separate ports:

* **Backend**:
  ```bash
  cd inference
  pip install -r requirements.txt
  python -m uvicorn main:app --reload --port 8000
  ```
  API documentation is available at `http://localhost:8000/docs`.

* **Frontend**:
  ```bash
  cd web
  npm install
  npm run dev
  ```
  Frontend runs on `http://localhost:3000`. Configure `NEXT_PUBLIC_INFERENCE_API_URL=http://localhost:8000` in `web/.env.local`.
