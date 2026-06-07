# MajiCast — Vercel Services Deployment Guide

This project is configured to deploy both the Next.js frontend and the FastAPI python backend entirely to Vercel using the **Vercel Services** pack. This allows both stacks to run under a single Vercel project, sharing the same domain name and configuration.

## Architecture

| Service | Stack | Route Prefix | Vercel Service Name |
|---------|-------|--------------|---------------------|
| **Frontend** | Next.js | `/` (root) | `web` |
| **Backend** | FastAPI / Python | `/api-inference` | `api` |

Both services are defined in the root-level [vercel.json](file:///c:/Users/ngang/OneDrive/Desktop/Projects/Data%20Science/MajiCast/vercel.json) configuration:

```json
{
  "experimentalServices": {
    "web": {
      "entrypoint": "web",
      "routePrefix": "/"
    },
    "api": {
      "entrypoint": "inference/main.py",
      "routePrefix": "/api-inference"
    }
  }
}
```

---

## Step 1 — Verify Model Pickles

Ensure that the trained machine learning model files are copied into [inference/models/](file:///c:/Users/ngang/OneDrive/Desktop/Projects/Data%20Science/MajiCast/inference/models/):
- `environmental.pkl`
- `nlp_pipeline.pkl`
- `water_quality_pipeline.pkl`

These model files are loaded during the FastAPI service lifespan. When deployed on Vercel, the `inference/models/` folder is bundled inside the serverless function.

---

## Step 2 — Deploy on Vercel

1. Go to **[vercel.com](https://vercel.com)** → **Add New Project** → Import the **MajiCast** repository.
2. **⚠️ CRITICAL — Select the "Services" Framework Preset:**
   - In the Vercel project configuration screen, select **Services** as the Framework Preset (instead of Next.js or Other). This tells Vercel to read the root-level `vercel.json` configuration and deploy multiple stacks.
3. Configure the following **Environment Variables** in Vercel:

   | Variable | Value | Description |
   |----------|-------|-------------|
   | `NEXT_PUBLIC_INFERENCE_API_URL` | `/api-inference` | Relative URL used by the browser to call the FastAPI backend. |
   | `INFERENCE_API_URL` | `/api-inference` | Relative URL used server-side by Next.js API routes. |
   | `GEMINI_API_KEY` | *Your Gemini API key* | Used for citizen report NLP classification. |

4. Click **Deploy**.

---

## Step 3 — Verification

Once live, verify that all aspects of the application are working correctly:
- **Home / Dashboard (`/`)**: Home page loads successfully.
- **Analysis View (`/analysis`)**: Renders the map and correctly reads `environmental.csv`.
- **Manual Sensor Input (`/sensor`)**: Calling anomalies correctly makes a relative POST request to `/api-inference/predict/sensor`.
- **Citizen Reports NLP (`/nlp`)**: The text analysis tool correctly processes reports using Gemini API.

---

## Local Development (Vercel CLI)

You can run the full multi-service stack locally using the Vercel CLI. This matches the Vercel production environment routing exactly:

```bash
# Install Vercel CLI if not already installed
npm install -g vercel

# Run the dev server (automatically routes both Next.js and Python FastAPI)
vercel dev -L
```

Alternatively, you can run the services manually:
1. Start Next.js dev server on port 3000: `cd web && npm run dev`
2. Start FastAPI server on port 8000: `python -m uvicorn inference.main:app --reload`
*(Note: If running manually, set `NEXT_PUBLIC_INFERENCE_API_URL=http://localhost:8000` in `web/.env.local`)*.

---

## Previous Deployment (Streamlit Legacy App)

The original Streamlit application is preserved in the [app/](file:///c:/Users/ngang/OneDrive/Desktop/Projects/Data%20Science/MajiCast/app/) folder. This serves as a monolithic fallback interface.

### Running Streamlit Locally

1. Ensure you have the conda or virtual environment activated.
2. Install the necessary dependencies (defined in the root [requirements.txt](file:///c:/Users/ngang/OneDrive/Desktop/Projects/Data%20Science/MajiCast/requirements.txt)):
   ```bash
   pip install -r requirements.txt
   ```
3. Run the Streamlit application:
   ```bash
   streamlit run app/streamlit_app.py
   ```

### Deploying Streamlit to Streamlit Community Cloud

1. Push your repository to GitHub.
2. Log in to [Streamlit Community Cloud](https://share.streamlit.io/).
3. Click **New app** and select the repository.
4. Set the **Main file path** to `app/streamlit_app.py`.
5. Under **Advanced settings**, optionally set any environment variables if required.
6. Click **Deploy**. Streamlit will provision the environment using the root `requirements.txt` and load models/data directly from the bundled relative paths.

