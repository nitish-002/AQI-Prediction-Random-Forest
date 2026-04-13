import joblib
import pandas as pd
import numpy as np
import os
import logging
from feature_engineering import build_features

logger = logging.getLogger(__name__)

# Relative path up one directory where we serialized the model
MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ML-Model", "tuned_aqi_model.pkl")

# Load model ONCE at startup
print("Initializing Machine Learning Service...")
try:
    if os.path.exists(MODEL_PATH):
        aqi_model = joblib.load(MODEL_PATH)
        print(f"Model loaded securely from {MODEL_PATH}")
    else:
        aqi_model = None
        print(f"Warning: Model not found at {MODEL_PATH}")
except Exception as e:
    print(f"Error loading model mapping: {e}")
    aqi_model = None

def make_prediction(request_data: dict, db, current_time) -> float:
    """Takes base inputs, runs them through the stateful feature engine, and predicts."""
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
