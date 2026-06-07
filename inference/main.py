"""
MajiCast FastAPI Inference Service
====================================
Serves the three trained ML models:
  - nlp_pipeline.pkl           → POST /predict/nlp
  - environmental.pkl          → POST /predict/environmental
  - water_quality_pipeline.pkl → POST /predict/sensor

Startup downloads required NLTK resources and loads all models once into
module-level singletons so subsequent requests are low-latency.

IMPORTANT: inference/models.py must be imported BEFORE any joblib.load() call.
register_for_pickle() fixes two serialization artefacts:
  1. Injects scripts.train_isolation_forest.WaterQualityPipeline into sys.modules
  2. Attaches clean_texts / clean_text to __main__ for the NLP FunctionTransformer
"""

# ── stdlib ──────────────────────────────────────────────────────────────────
import os
import sys
import logging
import warnings
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

# Suppress XGBoost's pickle-version mismatch UserWarning. The model predicts
# correctly — this is a cosmetic warning about using save_model() instead of
# pickle for new XGBoost models. Since we can't re-serialize the existing pkl,
# we silence it to keep startup logs clean.
warnings.filterwarnings(
    "ignore",
    message=".*If you are loading a serialized model.*",
    category=UserWarning,
)

# ── CRITICAL: register shims BEFORE any joblib.load() ──────────────────────
from models import (
    WaterQualityPipeline,
    clean_text,          # used in /predict/nlp handler
    register_for_pickle,
)
register_for_pickle()

# ── third-party ─────────────────────────────────────────────────────────────
import joblib
import nltk
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")
logger = logging.getLogger("majicast.inference")

# ── paths ────────────────────────────────────────────────────────────────────
ROOT_DIR = Path(__file__).parent.parent          # repo root
NLTK_DIR = Path("/tmp") / "nltk_data"

# Try local inference/models/ first (for Vercel deployment), then fall back to app/models/
LOCAL_MODELS_DIR = Path(__file__).parent / "models"
if LOCAL_MODELS_DIR.exists():
    MODELS_DIR = LOCAL_MODELS_DIR
else:
    MODELS_DIR = ROOT_DIR / "app" / "models"         # app/models/ — used by Streamlit

# ── NLTK setup ───────────────────────────────────────────────────────────────
REQUIRED_NLTK_RESOURCES = [
    ("tokenizers/punkt",     "punkt"),
    ("corpora/stopwords",    "stopwords"),
    ("corpora/wordnet",      "wordnet"),
    ("corpora/omw-1.4",      "omw-1.4"),
    ("tokenizers/punkt_tab", "punkt_tab"),
]


def ensure_nltk_resources() -> None:
    """Download any missing NLTK resources into the /tmp/nltk_data dir."""
    NLTK_DIR.mkdir(parents=True, exist_ok=True)
    if str(NLTK_DIR) not in nltk.data.path:
        nltk.data.path.append(str(NLTK_DIR))
    os.environ["NLTK_DATA"] = str(NLTK_DIR)

    for resource_path, resource_name in REQUIRED_NLTK_RESOURCES:
        try:
            nltk.data.find(resource_path)
            logger.info("NLTK resource present: %s", resource_name)
        except (LookupError, OSError, Exception):
            logger.info("Downloading NLTK resource: %s", resource_name)
            nltk.download(resource_name, download_dir=str(NLTK_DIR), quiet=True)


# ── module-level singletons (populated in lifespan) ─────────────────────────
_nlp_pipeline = None
_env_model = None
_sensor_pipeline = None

# ── environmental model — required feature columns (in order) ────────────────
ENV_FEATURE_COLS = [
    "water_source_clean", "water_source_category", "water_tech_clean",
    "clean_adm1", "clean_adm2", "clean_adm3", "status_clean",
    "distance_to_primary", "distance_to_secondary", "distance_to_tertiary",
    "distance_to_city", "distance_to_town", "local_population", "served_population",
    "crucialness", "pressure", "staleness_score", "latitude", "longitude",
    "chirps_30_precipitation", "ndvi_30_NDVI", "lst_30_LST_Day_1km", "pop_population",
]

# ── risk metadata helpers ─────────────────────────────────────────────────────
RISK_LABEL_MAP: Dict[int, str] = {
    0: "Safe Quality",
    1: "Low Risk",
    2: "Medium Risk",
    3: "High Risk",
}

DEFAULT_ENCODED_VALUE = 0   # station_encoded default for anonymous sensor readings


# ── NLP text cleaning ──────────────────────────────────────────────────────
# clean_text is imported from models (single source of truth).
# It is also registered on __main__ by register_for_pickle() so that the
# sklearn FunctionTransformer inside nlp_pipeline.pkl can resolve its
# __main__.clean_texts reference at deserialization time.


# ── lifespan: load models once on startup ────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _nlp_pipeline, _env_model, _sensor_pipeline

    logger.info("=== MajiCast Inference Service — startup ===")

    # 1. NLTK resources — downloads to inference/nltk_data/ if missing.
    # inference/models.py _ensure_nltk() will also lazy-init on first prediction
    # call, but pre-warming here avoids latency on the first request.
    ensure_nltk_resources()
    logger.info("NLTK resources ready")

    # 2. NLP pipeline
    nlp_path = MODELS_DIR / "nlp_pipeline.pkl"
    logger.info("Loading NLP pipeline from %s", nlp_path)
    _nlp_pipeline = joblib.load(nlp_path)
    logger.info("NLP pipeline loaded: %s", type(_nlp_pipeline).__name__)

    # 3. Environmental XGBoost model
    env_path = MODELS_DIR / "environmental.pkl"
    logger.info("Loading environmental model from %s", env_path)
    _env_model = joblib.load(env_path)
    logger.info("Environmental model loaded: %s", type(_env_model).__name__)

    # 4. Water quality / sensor pipeline (WaterQualityPipeline)
    # register_for_pickle() was already called at module import time, so
    # the shim is in sys.modules before joblib reaches the class reference.
    sensor_path = MODELS_DIR / "water_quality_pipeline.pkl"
    logger.info("Loading sensor pipeline from %s", sensor_path)
    _sensor_pipeline = joblib.load(sensor_path)
    logger.info("Sensor pipeline loaded: %s", type(_sensor_pipeline).__name__)

    logger.info("=== All models ready — serving requests ===")
    yield

    logger.info("=== MajiCast Inference Service — shutdown ===")


# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="MajiCast Inference API",
    description=(
        "ML inference endpoints for MajiCast — water quality monitoring and "
        "contamination risk prediction for Kenya."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the Vercel frontend, local dev, LAN devices, and Railway
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://192.168.147.105:3000",  # host machine LAN IP
        "https://*.vercel.app",          # Vercel preview deployments
        "https://majicast.vercel.app",   # Vercel production
        "https://*.railway.app",         # Railway deployments
        "https://*.up.railway.app",      # Railway public domains
    ],
    allow_origin_regex=(
        r"https://.*\.vercel\.app"
        r"|https://.*\.railway\.app"         # all Railway subdomains
        r"|https://.*\.up\.railway\.app"     # all Railway public domains
        r"|http://192\.168\.\d+\.\d+(:\d+)?"   # any 192.168.x.x LAN device
        r"|http://10\.\d+\.\d+\.\d+(:\d+)?"    # any 10.x.x.x LAN device
        r"|http://172\.(1[6-9]|2\d|3[01])\.\d+\.\d+(:\d+)?"  # 172.16-31.x.x
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── request / response schemas ────────────────────────────────────────────────

class NLPRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Raw user-entered text to classify.")

    model_config = {"json_schema_extra": {"example": {"text": "The water looks brown and smells like sewage."}}}


class NLPResponse(BaseModel):
    label: str       # "Safe" | "Unsafe"
    confidence: float  # 0.0 – 1.0


class EnvironmentalRow(BaseModel):
    """One water point record with all 23 feature columns."""
    water_source_clean: Optional[Any] = None
    water_source_category: Optional[Any] = None
    water_tech_clean: Optional[Any] = None
    clean_adm1: Optional[Any] = None
    clean_adm2: Optional[Any] = None
    clean_adm3: Optional[Any] = None
    status_clean: Optional[Any] = None
    distance_to_primary: Optional[float] = None
    distance_to_secondary: Optional[float] = None
    distance_to_tertiary: Optional[float] = None
    distance_to_city: Optional[float] = None
    distance_to_town: Optional[float] = None
    local_population: Optional[float] = None
    served_population: Optional[float] = None
    crucialness: Optional[float] = None
    pressure: Optional[float] = None
    staleness_score: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    chirps_30_precipitation: Optional[float] = None
    ndvi_30_NDVI: Optional[float] = None
    lst_30_LST_Day_1km: Optional[float] = None
    pop_population: Optional[float] = None

    model_config = {"extra": "allow"}  # pass-through any extra columns unchanged


class EnvironmentalRequest(BaseModel):
    rows: List[Dict[str, Any]] = Field(
        ..., description="Array of water point feature objects."
    )


class EnvironmentalPrediction(BaseModel):
    predicted_risk: int    # 0-3
    risk_label: str        # "Safe Quality" | "Low Risk" | "Medium Risk" | "High Risk"
    risk_score: float      # quality score 0-100 (higher = better quality)


class EnvironmentalResponse(BaseModel):
    predictions: List[EnvironmentalPrediction]


class SensorRequest(BaseModel):
    pH: float = Field(..., ge=0.0, le=14.0, description="pH level (0–14).")
    TEMP: float = Field(..., ge=0.0, le=100.0, description="Water temperature in °C.")
    EC: float = Field(..., ge=0.0, le=10000.0, description="Electrical conductivity µS/cm.")

    model_config = {
        "json_schema_extra": {
            "example": {"pH": 7.4, "TEMP": 22.0, "EC": 350.0}
        }
    }


class SensorResponse(BaseModel):
    risk_score: float   # 0.0 – 1.0 (higher = riskier)
    verdict: str        # "Safe" | "Action Required"


# ── endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health", tags=["Meta"])
async def health() -> Dict[str, str]:
    """Liveness probe — returns {"status": "ok"} when all models are loaded."""
    models_ready = all(
        m is not None for m in [_nlp_pipeline, _env_model, _sensor_pipeline]
    )
    if not models_ready:
        raise HTTPException(status_code=503, detail="Models not yet loaded.")
    return {"status": "ok"}


@app.post("/predict/nlp", response_model=NLPResponse, tags=["Prediction"])
async def predict_nlp(body: NLPRequest) -> NLPResponse:
    """
    Classify free-form water quality text as Safe or Unsafe.

    Applies the same clean_text() preprocessing used during NLP model training
    before passing to the sklearn TF-IDF + classifier pipeline.
    """
    if _nlp_pipeline is None:
        raise HTTPException(status_code=503, detail="NLP model not loaded.")

    cleaned = clean_text(body.text)
    if not cleaned.strip():
        raise HTTPException(
            status_code=422,
            detail="Text reduced to empty string after cleaning. Please provide more detail.",
        )

    prediction: int = int(_nlp_pipeline.predict([cleaned])[0])
    proba: np.ndarray = _nlp_pipeline.predict_proba([cleaned])[0]
    confidence: float = float(proba[prediction])

    label_map = {0: "Safe", 1: "Unsafe"}
    return NLPResponse(label=label_map[prediction], confidence=round(confidence, 4))


@app.post("/predict/environmental", response_model=EnvironmentalResponse, tags=["Prediction"])
async def predict_environmental(body: EnvironmentalRequest) -> EnvironmentalResponse:
    """
    Predict contamination risk tier (0-3) for one or more water point records.

    Input rows must contain the 23 environmental feature columns. Extra columns
    are allowed and ignored. Missing feature columns default to NaN (the model
    handles these via its own imputation/encoding).
    """
    if _env_model is None:
        raise HTTPException(status_code=503, detail="Environmental model not loaded.")
    if not body.rows:
        raise HTTPException(status_code=422, detail="rows array must not be empty.")

    df = pd.DataFrame(body.rows)

    # Ensure all expected columns exist; fill missing with NaN
    for col in ENV_FEATURE_COLS:
        if col not in df.columns:
            df[col] = np.nan

    try:
        predictions_raw: np.ndarray = _env_model.predict(df)
    except Exception as exc:
        logger.exception("Environmental model prediction failed")
        raise HTTPException(status_code=500, detail=f"Prediction error: {exc}") from exc

    results: List[EnvironmentalPrediction] = []
    for pred_int in predictions_raw:
        pred_int = int(pred_int)
        # quality_score formula from streamlit_app.py line 585
        quality_score = round((1 - pred_int / 3 * 0.75) * 100, 1)
        results.append(
            EnvironmentalPrediction(
                predicted_risk=pred_int,
                risk_label=RISK_LABEL_MAP.get(pred_int, "Unknown"),
                risk_score=quality_score,
            )
        )

    return EnvironmentalResponse(predictions=results)


@app.post("/predict/sensor", response_model=SensorResponse, tags=["Prediction"])
async def predict_sensor(body: SensorRequest) -> SensorResponse:
    """
    Predict water risk from cheap sensor readings (pH, Temperature, EC).

    Uses the WaterQualityPipeline (IsolationForest) trained on GEMS data.
    station_encoded is always 0 (DEFAULT_ENCODED_VALUE) for anonymous readings.
    """
    if _sensor_pipeline is None:
        raise HTTPException(status_code=503, detail="Sensor model not loaded.")

    inputs_df = pd.DataFrame(
        [{
            "pH": body.pH,
            "TEMP": body.TEMP,
            "EC": body.EC,
            "station_encoded": DEFAULT_ENCODED_VALUE,
        }]
    )

    try:
        risk_scores: np.ndarray = _sensor_pipeline.predict_risk(inputs_df)
    except Exception as exc:
        logger.exception("Sensor pipeline prediction failed")
        raise HTTPException(status_code=500, detail=f"Prediction error: {exc}") from exc

    risk_score: float = float(risk_scores[0])
    verdict = "Action Required" if risk_score > 0.5 else "Safe"

    return SensorResponse(risk_score=round(risk_score, 4), verdict=verdict)
