"""
Verify that all three pkl models load correctly using the inference service's
module path shim. Run from the repo root with:

    conda run -n majicast python test_pkl_load.py
"""
import sys
import os

# Ensure inference package is importable from repo root
sys.path.insert(0, os.path.abspath('.'))

# --- CRITICAL: register shim BEFORE any joblib.load ---
from inference.models import register_for_pickle
register_for_pickle()

import joblib
import pandas as pd
import numpy as np
from pathlib import Path

MODELS = Path('app/models')

print("\n=== 1. NLP Pipeline ===")
nlp = joblib.load(MODELS / 'nlp_pipeline.pkl')
print(f"  Type       : {type(nlp)}")
test_pred = nlp.predict(["The water is brown and smells bad."])
test_proba = nlp.predict_proba(["The water is brown and smells bad."])
print(f"  predict()  : {test_pred}  ({['Safe','Unsafe'][test_pred[0]]})")
print(f"  proba()    : {test_proba[0].round(4)}")

print("\n=== 2. Environmental Model ===")
env = joblib.load(MODELS / 'environmental.pkl')
print(f"  Type       : {type(env)}")

# Load a real row from environmental.csv so the OrdinalEncoder/OneHotEncoder
# inside the imblearn Pipeline receives properly typed string values.
feature_cols = [
    "water_source_clean", "water_source_category", "water_tech_clean",
    "clean_adm1", "clean_adm2", "clean_adm3", "status_clean",
    "distance_to_primary", "distance_to_secondary", "distance_to_tertiary",
    "distance_to_city", "distance_to_town", "local_population", "served_population",
    "crucialness", "pressure", "staleness_score", "latitude", "longitude",
    "chirps_30_precipitation", "ndvi_30_NDVI", "lst_30_LST_Day_1km", "pop_population"
]
csv_path = Path('app/data/environmental.csv')
sample_df = pd.read_csv(csv_path, nrows=1)[feature_cols]
env_pred = env.predict(sample_df)
print(f"  predict()  : {env_pred}  (risk tier {env_pred[0]})")

print("\n=== 3. Water Quality / Sensor Pipeline ===")
sensor = joblib.load(MODELS / 'water_quality_pipeline.pkl')
print(f"  Type       : {type(sensor)}")
print(f"  Module     : {type(sensor).__module__}")
sensor_df = pd.DataFrame([{'pH': 7.4, 'TEMP': 22.0, 'EC': 350.0, 'station_encoded': 0}])
risk = sensor.predict_risk(sensor_df)
verdict = "Action Required" if risk[0] > 0.5 else "Safe"
print(f"  predict_risk(): {risk[0]:.4f}  → verdict: {verdict}")

print("\n=== All models loaded and verified successfully ===\n")
