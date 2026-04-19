import joblib
import pandas as pd
import numpy as np
import os
import logging
from feature_engineering import build_features

logger = logging.getLogger(__name__)

# Paths
BASE_MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ML-Model", "tuned_aqi_model.pkl")
RETRAINED_MODEL_PATH = os.path.join(os.path.dirname(__file__), "data", "latest_retrained_model.pkl")

aqi_model = None
last_loaded_time = 0

def load_latest_model():
    global aqi_model, last_loaded_time
    
    # Prefer retrained model if available
    target_path = RETRAINED_MODEL_PATH if os.path.exists(RETRAINED_MODEL_PATH) else BASE_MODEL_PATH
    
    if os.path.exists(target_path):
        mtime = os.path.getmtime(target_path)
        if mtime > last_loaded_time:
            print(f"Loading/Reloading Model from {target_path}")
            aqi_model = joblib.load(target_path)
            last_loaded_time = mtime
            print("Model successfully loaded into memory.")
    else:
        if aqi_model is None:
            print(f"Warning: No valid model found at {target_path}")

# Initial load
load_latest_model()

def make_prediction(request_data: dict, db, current_time) -> float:
    """Takes base inputs, runs them through the stateful feature engine, and predicts."""
    load_latest_model()
    if aqi_model is None:
        raise ValueError("Machine learning model is currently unavailable.")
    
    # Check if model has predefined feature names to handle pandas conversion properly
    feature_names = getattr(aqi_model, 'feature_names_in_', None)
    
    try:
        # Build 212-feature matrix based on latest historical windows
        df = build_features(db, current_time, request_data, list(feature_names) if feature_names is not None else [])
        
        prediction = aqi_model.predict(df)[0]
        return float(prediction)
    except Exception as e:
        logger.error(f"Prediction Pipeline Error: {e}")
        raise ValueError(f"Processing failed: {e}")
