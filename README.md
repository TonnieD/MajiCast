# MajiCast

MajiCast (formerly CleanWatAI) is an end-to-end machine learning system for monitoring and predicting water quality and contamination risk in Kenya. The system integrates multiple data sources (WPDx, GEMS, and satellite data via Google Earth Engine), processes them through ML models, and exposes interactive insights, anomaly detection, mapping, and reports.

The application has been migrated from a single-file Streamlit script into a production-grade decoupled architecture:
1. **FastAPI Inference Service**: Serves predictions from the 3 trained ML models.
2. **Next.js 14 Frontend**: A modern, high-fidelity responsive dashboard styled with an earthy design system.

---

## Architecture and Folder Structure

```
MajiCast/
├── app/                                       # Original Streamlit dashboard (preserved)
├── data/                                      # Data storage hierarchy
│   ├── raw/                                   # WPDx, GEMS, and GEE source datasets
│   └── processed/                             # Merged datasets (environmental.csv)
├── inference/                                 # FastAPI Inference Backend Service
│   ├── main.py                                # API endpoints, NLTK resource manager, and CORS
│   ├── models.py                              # Deserialization shims for sklearn/XGBoost pipelines
│   └── requirements.txt                       # Python dependencies for the backend
├── models/                                    # Trained ML model artifacts (.pkl files)
├── notebooks/                                 # Jupyter analysis notebooks (CRISP-DM flow)
├── scripts/                                   # Model training and data preparation scripts
└── web/                                       # Next.js 14 Web Application
    ├── public/                                # Static assets (images, maps)
    ├── src/
    │   ├── app/                               # Next.js pages (Home, NLP, Insights, Map, Sensor, Analysis)
    │   │   └── api/data/route.ts              # Data query, pagination, and upload handler
    │   ├── components/                        # Navigation sidebar, dynamic Leaflet map
    │   └── globals.css                        # Design system theme configuration
    ├── next.config.ts                         # Next.js environment configurations
    └── tailwind.config.ts                     # Tailwind custom styling setup
```

---

## Machine Learning Models Served

MajiCast serves three specialized machine learning models:
1. **NLP Text Classifier (`nlp_pipeline.pkl`)**: Classifies free-form citizen water quality descriptions as Safe or Unsafe with a calculated prediction confidence.
2. **Environmental XGBoost Classifier (`environmental.pkl`)**: Predicts water point contamination risk tiers (Safe Quality, Low Risk, Medium Risk, High Risk) based on 23 geographical, infrastructural, and environmental features.
3. **Sensor Anomaly Detector (`water_quality_pipeline.pkl`)**: An Isolation Forest model that evaluates pH, temperature, and electrical conductivity to identify water contamination anomalies.

---

## Quick Start Guide

### 1. Run the FastAPI Inference Backend

The backend is built using FastAPI and serves all three machine learning models.

**Prerequisites:**
- Python 3.8+ (tested on Python 3.12)
- Conda or virtualenv (recommended)

**Setup:**
1. Navigate to the project root.
2. Create and activate a conda environment:
   ```bash
   conda create -y -n majicast python=3.12
   conda activate majicast
   ```
3. Install dependencies:
   ```bash
   pip install -r inference/requirements.txt
   ```
4. Start the FastAPI server using Uvicorn:
   ```bash
   uvicorn inference.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   The interactive Swagger documentation will be available at `http://localhost:8000/docs` and the API endpoints can be tested directly from there.

---

### 2. Run the Next.js Frontend

The frontend is a modern web application created using Next.js 14, TypeScript, Tailwind CSS, Recharts, and React Leaflet.

**Prerequisites:**
- Node.js 18.x or later
- npm or yarn

**Setup:**
1. Navigate to the `web/` directory:
   ```bash
   cd web
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` or `.env.local` file inside the `web/` directory (or use `.env.example` as a reference in the root):
   ```env
   NEXT_PUBLIC_INFERENCE_API_URL=http://localhost:8000
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser to explore the dashboard.

5. Build the application for production:
   ```bash
   npm run build
   ```

---

### 3. Run Everything with Docker Compose

You can containerize and launch both the Next.js frontend and the FastAPI backend using Docker Compose in a single command.

**Prerequisites:**
- Docker and Docker Compose installed.

**Setup & Start:**
1. Navigate to the project root.
2. Ensure you have a `.env` file in the root containing your keys:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. Run the following command to build and launch the containers:
   ```bash
   docker compose up --build
   ```
   This builds both services, links them through an internal network (allowing server-to-server calls to bypass local ports), and exposes:
   - Next.js Frontend: `http://localhost:3000`
   - FastAPI Backend: `http://localhost:8000`

4. To stop the containers, run:
   ```bash
   docker compose down
   ```

---

## Application Features

- **Home**: Learn about MajiCast's mission, vision, and the core development team (Diana, Phanela, Lewis, Margaret, and Anthony).
- **NLP Water Report**: A natural language query interface combined with structured indicators (odor, color, clarity) to predict water safety from text descriptions.
- **Quick Insights**: Dynamic metrics aggregated by district, complete with interactive risk distribution charts and real-time alerts.
- **Risk Map**: An interactive map powered by React Leaflet showing colored markers representing risk tiers for all water points across Kenya. Includes detailed point information panels and coverage indicators.
- **Sensor Detection**: Pre-built water sensor scenarios (e.g. Clean Borehole vs. Acid Mine Drainage) and custom inputs to detect chemical anomalies via Isolation Forest.
- **Data Analysis**: A complete tabular dashboard featuring pagination, status distribution bar charts, regional average risk scores, and 30-day simulated quality trend lines. Supports CSV downloads and custom dataset uploads.
