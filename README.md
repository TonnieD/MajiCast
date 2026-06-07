# MajiCast (formerly CleanWatAI)

MajiCast is an end-to-end, production-grade machine learning system designed to monitor and predict water quality and contamination risk in Kenya. By integrating chemical indicators, geospatial infrastructure logs, and remote sensing satellite data, MajiCast equips NGOs, local governments, and water authorities with proactive decision-making tools to prevent public health crises.

The system has been refactored from a single-file Streamlit script into a high-performance decoupled architecture deployed entirely on **Vercel** using the new **Vercel Services** pack.

---

## 🏗️ Architecture & Folder Structure

```
MajiCast/
├── app/                                       # Streamlit legacy dashboard (preserved)
│   ├── data/                                  # Fallback Streamlit dataset
│   └── models/                                # Streamlit model pickles
├── data/                                      # Data storage hierarchy
│   ├── raw/                                   # WPDx, GEMS, and GEE source datasets
│   └── processed/                             # Merged datasets (environmental.csv)
├── inference/                                 # FastAPI Inference Backend Service
│   ├── models/                                # Model pickles (.pkl) bundled for Vercel
│   ├── main.py                                # FastAPI app endpoints & CORS middleware
│   └── requirements.txt                       # Backend Python dependencies
├── notebooks/                                 # Jupyter analysis notebooks (CRISP-DM flow)
│   ├── 01_data_extraction.ipynb              # Data ingestion and raw loads
│   ├── 05_xgboost_model_training.ipynb       # XGBoost model development
│   ├── 06_nlp_model_training.ipynb           # TF-IDF & text classifier training
│   └── train_isolation_forest.ipynb          # Sensor anomaly detection
├── vercel.json                                # Root Vercel Services configuration
└── web/                                       # Next.js Web Application
    ├── public/                                # Static assets (images, markers)
    └── src/
        ├── app/                               # Next.js App Router (Home, Maps, NLP)
        │   └── api/data/route.ts              # Data query, upload, & proxy handler
        └── globals.css                        # Design system theme configuration
```

---

## 🧪 Data Science & Machine Learning Flow

MajiCast aligns with the **CRISP-DM** (Cross-Industry Standard Process for Data Mining) methodology, transforming raw geospatial, satellite, and crowdsourced data into actionable public health risk scores.

```mermaid
graph TD
    A[Data Sources: GEMS, WPDx, GEE] --> B[Data Prep: Cleaning & Imbalance Correction]
    B --> C[Feature Engineering: Distances, Pressure, Staleness]
    C --> D1[XGBoost Classifier - Environmental]
    C --> D2[Isolation Forest - Sensor Anomalies]
    C --> D3[TF-IDF + Random Forest - NLP Logs]
    D1 --> E[Ensemble Risk Score Formulation]
    D2 --> E
    D3 --> E
    E --> F[Vercel Services Deployment]
```

### 1. Data Ingestion & Sources
* **Chemical Water Quality (GEMS)**: Sourced from Global Environment Monitoring System (GEMStat). It contains physical parameters (pH, Temperature, Electrical Conductivity) and laboratory chemical measurements (Dissolved Oxygen, Nitrates, Nitrites, Ammonia).
* **Environmental & Infrastructure (WPDx)**: Infrastructure logs from the Water Point Data Exchange (22k+ records for Kenya) including water source types, technologies used, status (functional vs. non-functional), and installation years.
* **Remote Sensing (Google Earth Engine)**: Features extracted from satellite bands, matching location coordinates:
  * **Rainfall (CHIRPS)**: Sum of precipitation over the past 30 days (proxy for run-off contamination).
  * **Land Surface Temperature (MODIS LST)**: LST Day 1km 8-day average (indicative of evaporation rates).
  * **Vegetation (NDVI)**: Normalized Difference Vegetation Index (agricultural presence and run-off risk).

### 2. Feature Engineering & Preprocessing
* **Class Imbalance**: Synthetic Minority Over-sampling (SMOTE) and random upsampling were applied in notebooks to balance under-represented risk classes (e.g., Safe vs. Unsafe, or specific minor risk classes in textual reports).
* **Geo-distance Features**: Calculated Euclidean distances to secondary/tertiary structures, nearest major cities, and key water towers to assess accessibility and potential contaminant proximity.
* **Derived Engineering**:
  * `staleness_score`: Cumulative age and lack of maintenance calculation.
  * `crucialness`: Calculated index representing the water point's population dependency.
  * `pressure`: Physical stress index based on local population and output capacity.

---

## 🤖 Machine Learning Models

MajiCast trains and serves three distinct machine learning models designed to address data sparsity in rural water monitoring.

### 1. Environmental Classifier (XGBoost)
* **Objective**: Predicts water point contamination risk tier (`0: Safe Quality`, `1: Low Risk`, `2: Medium Risk`, `3: High Risk`) based on 23 geospatial and environmental features.
* **Algorithm**: Tuned Extreme Gradient Boosting (XGBoost) model combined with a `ColumnTransformer` (StandardScaler for numerical features, OneHotEncoder for categorical features).
* **Hyperparameters**:
  ```python
  {'model__subsample': 0.8, 'model__n_estimators': 100, 'model__max_depth': 10, 'model__learning_rate': 0.1, 'model__gamma': 0}
  ```
* **Performance Metrics**:
  * **Accuracy**: **81.03%**
  * **Weighted F1-Score**: **80.72%**
  * **Recall**: **81.03%**
* **Confusion Matrix Analysis**: Solid performance on majority classes, with minor overlap between adjacent risk levels (e.g., Class 2 vs Class 3).

### 2. NLP Text Classifier (Random Forest / Logistic Regression)
* **Objective**: Classifies citizen water quality descriptions as "Safe" or "Unsafe".
* **Text Preprocessing**: Lowercasing, negations handling (e.g., converting "not clean" to "no_clean" to preserve meaning), punctuation removal, tokenization, stopword filtering, and lemmatization using WordNet.
* **Vectorization**: TF-IDF (Term Frequency-Inverse Document Frequency) with n-gram range of `(1, 2)`.
* **Performance Metrics**: The tuned Random Forest model achieves **100% Precision, Recall, and F1-score** on the balanced evaluation dataset, identifying key risk keywords like *diarrhea*, *smell*, *cloudy*, *rust*, and *illness*.

### 3. Sensor Anomaly Detector (Isolation Forest)
* **Objective**: Detects anomalies and potential contamination in real-time utilizing cheap, portable sensor measurements.
* **Algorithm**: Unsupervised `IsolationForest` anomaly detector.
* **Deployment Models**:
  * **Base Model**: Uses comprehensive features (sensor + laboratory chemical measurements).
  * **Inference Model**: Uses only sensor-based features (`pH`, `TEMP`, `EC`, `station_encoded`) for immediate real-time verdicts in the field.
* **Evaluation**: Evaluated using Precision-Recall curve analysis and Area Under Precision-Recall (AUC-PR) metrics, optimized to balance sensitivity while minimizing false-alarm testing dispatches.

---

## 🚀 Deployment (Vercel Services)

MajiCast is configured as a monorepo containing both the Next.js web application and the Python FastAPI backend. They are deployed together under the same Vercel domain using **Vercel Services**.

### 1. Vercel Configuration
The root-level `vercel.json` maps incoming routing paths to independent services:
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

### 2. Next.js Routing
Next.js serverless functions communicate with the FastAPI backend through a unified route proxy ([route.ts](file:///c:/Users/ngang/OneDrive/Desktop/Projects/Data%20Science/MajiCast/web/src/app/api/data/route.ts)) that dynamically prepends the host domain name:
```typescript
let backendUrl = process.env.INFERENCE_API_URL || process.env.NEXT_PUBLIC_INFERENCE_API_URL;
if (backendUrl.startsWith("/")) {
  const host = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
  backendUrl = `${host}${backendUrl}`;
}
```

---

## 🛠️ Quick Start Guide

### 1. Run via Vercel CLI (Local Production Mirror)
To run the Next.js frontend and the FastAPI backend together matching Vercel's production routing table:
```bash
npm install -g vercel
vercel dev -L
```

### 2. Run Services Manually (Separate Ports)
* **Backend (FastAPI)**:
  ```bash
  pip install -r requirements.txt
  python -m uvicorn inference.main:app --reload
  ```
  Swagger interactive docs will be available at `http://localhost:8000/docs`.

* **Frontend (Next.js)**:
  ```bash
  cd web
  npm run dev
  ```
  Frontend will be running on `http://localhost:3000`. Set `NEXT_PUBLIC_INFERENCE_API_URL=http://localhost:8000` in `web/.env.local`.

### 3. Run Streamlit Legacy App
```bash
pip install -r requirements.txt
streamlit run app/streamlit_app.py
```
Streamlit dashboard will run on `http://localhost:8501`.
