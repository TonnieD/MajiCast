"""
Custom class/function definitions required for deserializing all three
joblib-pickled MajiCast models.

Why this module exists
----------------------
joblib uses pickle internally. Pickle stores each object's class/function
by its module path at serialization time. When that path doesn't match what's
available at load time, you get AttributeError or ModuleNotFoundError.

Two serialization artefacts need fixing:

1. water_quality_pipeline.pkl
   Trained in a notebook that ran:
       from scripts.train_isolation_forest import WaterQualityPipeline
   Stored as: scripts.train_isolation_forest.WaterQualityPipeline
   Fix: inject a synthetic "scripts.train_isolation_forest" module into
        sys.modules pointing at our local WaterQualityPipeline class.

2. nlp_pipeline.pkl
   Trained in a notebook/script where clean_text / clean_texts were defined
   at __main__ scope. The sklearn FunctionTransformer inside the pipeline
   holds a reference to __main__.clean_texts.
   Fix: add clean_text and clean_texts as attributes on sys.modules['__main__']
        before any joblib.load() call.

Call register_for_pickle() ONCE, as early as possible in your entry point,
before importing joblib or calling joblib.load().
"""

from __future__ import annotations

import os
import re
import sys
import types
from typing import List

import numpy as np


# ─────────────────────────────────────────────────────────────────────────────
# Lazy NLTK helpers
# These functions mirror clean_text / clean_texts from app/streamlit_app.py
# exactly. They use lazy initialisation so NLTK resources are only loaded on
# the first prediction call (after ensure_nltk_resources() has run).
# ─────────────────────────────────────────────────────────────────────────────

_stop_words: set | None = None
_lemmatizer = None

# NLTK resources required by clean_text
_NLTK_RESOURCES = [
    ("tokenizers/punkt",     "punkt"),
    ("corpora/stopwords",    "stopwords"),
    ("corpora/wordnet",      "wordnet"),
    ("corpora/omw-1.4",      "omw-1.4"),
    ("tokenizers/punkt_tab", "punkt_tab"),
]


def _ensure_nltk() -> None:
    """
    Initialise NLTK stopwords and lemmatizer on first use.

    Downloads any missing resources automatically so this function is
    fully self-contained — no external setup call required before using
    clean_text() or clean_texts().
    """
    global _stop_words, _lemmatizer
    if _stop_words is not None:
        return

    import nltk
    from nltk.corpus import stopwords
    from nltk.stem import WordNetLemmatizer

    # Download any missing resources into NLTK's default user data dir
    for resource_path, resource_name in _NLTK_RESOURCES:
        try:
            nltk.data.find(resource_path)
        except LookupError:
            nltk.download(resource_name, quiet=True)

    _stop_words = set(stopwords.words("english"))
    _lemmatizer = WordNetLemmatizer()


def clean_text(text: str) -> str:
    """
    Preprocess a single text string for NLP model inference.

    Pipeline: lowercase → negation joining → punctuation removal →
              tokenise → lemmatise → stopword removal.

    Mirrors clean_text() in app/streamlit_app.py exactly.
    """
    _ensure_nltk()
    import nltk

    text = text.lower()
    text = re.sub(r"\b(no|not|never)\s+(\w+)", r"no_\2", text)
    text = re.sub(r"[^\w\s_]", "", text)
    tokens = nltk.word_tokenize(text)
    cleaned = [
        _lemmatizer.lemmatize(token)  # type: ignore[union-attr]
        for token in tokens
        if (token.startswith("no_"))
        or (token not in _stop_words and len(token) > 2)  # type: ignore[operator]
    ]
    return " ".join(cleaned)


def clean_texts(texts: List[str]) -> List[str]:
    """
    Preprocess a list of text strings.

    This is the function reference stored inside nlp_pipeline.pkl's
    FunctionTransformer. It must be reachable as __main__.clean_texts
    at deserialization time.
    """
    return [clean_text(t) for t in texts]


# ─────────────────────────────────────────────────────────────────────────────
# WaterQualityPipeline
# Exact copy of the class from scripts/train_isolation_forest.py.
# The pkl stores this as scripts.train_isolation_forest.WaterQualityPipeline.
# ─────────────────────────────────────────────────────────────────────────────

class WaterQualityPipeline:
    """
    Inference wrapper around a trained IsolationForest anomaly detector.

    Encapsulates the model, StandardScaler, and the min/max anomaly score
    bounds fitted at training time. Exposes predict_risk() which returns
    normalized risk scores in [0, 1].
    """

    def __init__(self, model, scaler, min_score: float, max_score: float):
        self.model = model
        self.scaler = scaler
        self.min_score = min_score
        self.max_score = max_score

    def predict_risk(self, data) -> np.ndarray:
        """
        Parameters
        ----------
        data : pd.DataFrame
            Columns: ['pH', 'TEMP', 'EC', 'station_encoded']

        Returns
        -------
        np.ndarray of float in [0, 1]. Higher = higher contamination risk.
        """
        data_scaled = self.scaler.transform(data)
        anomaly_scores = self.model.decision_function(data_scaled)
        return self.convert_to_risk_scores(anomaly_scores)

    def convert_to_risk_scores(self, anomaly_scores: np.ndarray) -> np.ndarray:
        """Normalise raw IsolationForest scores to the [0, 1] risk range."""
        denominator = self.max_score - self.min_score
        if denominator == 0:
            return np.zeros_like(anomaly_scores)
        risk_scores = (self.max_score - anomaly_scores) / denominator
        return np.clip(risk_scores, 0, 1)

    def save(self, filepath: str = "models/water_quality_pipeline.pkl") -> None:
        import joblib
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump(self, filepath)

    @staticmethod
    def load(filepath: str = "models/water_quality_pipeline.pkl") -> "WaterQualityPipeline":
        import joblib
        return joblib.load(filepath)


# ─────────────────────────────────────────────────────────────────────────────
# sys.modules registration
# ─────────────────────────────────────────────────────────────────────────────

def register_for_pickle() -> None:
    """
    Register all pickle-serialized symbols under the module paths that were
    recorded at training time. Must be called before any joblib.load().

    Fixes:
      • scripts.train_isolation_forest.WaterQualityPipeline
      • __main__.clean_texts  (and clean_text)
    """

    # ── Fix 1: WaterQualityPipeline ──────────────────────────────────────────
    module_path = "scripts.train_isolation_forest"
    synthetic = types.ModuleType(module_path)
    synthetic.WaterQualityPipeline = WaterQualityPipeline  # type: ignore[attr-defined]
    sys.modules[module_path] = synthetic

    # Ensure the "scripts" package entry exists
    if "scripts" not in sys.modules:
        scripts_pkg = types.ModuleType("scripts")
        sys.modules["scripts"] = scripts_pkg
    sys.modules["scripts"].train_isolation_forest = synthetic  # type: ignore[attr-defined]

    # ── Fix 2: clean_texts / clean_text on __main__ ─────────────────────────
    # The NLP pipeline's FunctionTransformer holds a reference serialized as
    # __main__.clean_texts. We attach our implementations to whichever module
    # is currently __main__ so pickle's find_class() resolves it correctly.
    main_module = sys.modules.get("__main__")
    if main_module is not None:
        if not hasattr(main_module, "clean_texts"):
            main_module.clean_texts = clean_texts  # type: ignore[attr-defined]
        if not hasattr(main_module, "clean_text"):
            main_module.clean_text = clean_text  # type: ignore[attr-defined]
