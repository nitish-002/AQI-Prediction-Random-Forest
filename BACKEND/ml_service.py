import joblib
import pandas as pd
import numpy as np
import os
import logging
import datetime
from typing import List
from feature_engineering import build_features, init_forecast_state, build_one_forecast_step

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


FORECAST_HORIZONS = [1, 3, 6, 12]  # hours ahead


def make_forecast(request_data: dict, db, current_time: datetime.datetime) -> List[dict]:
    """
    Recursive multi-step future AQI forecast.

    For each horizon in FORECAST_HORIZONS, the function:
      1. Builds the feature row for that future timestamp using the evolving
         rolling history buffers (init_forecast_state / build_one_forecast_step).
      2. Predicts CO(GT) with the trained Random Forest.
      3. Injects the predicted CO back into the history buffer so that the
         NEXT step's lag features reflect this prediction (recursive strategy).

    Returns a list of dicts, one per horizon:
      { hours_ahead, predicted_timestamp, predicted_co, predicted_aqi }
    """
    from aqi_calculator import calculate_co_aqi

    load_latest_model()
    if aqi_model is None:
        raise ValueError("Machine learning model is currently unavailable.")

    feature_names = list(getattr(aqi_model, 'feature_names_in_', []))

    try:
        # Initialise rolling history buffers from DB + current reading (called once)
        state = init_forecast_state(db, current_time, request_data)

        results = []
        max_horizon = max(FORECAST_HORIZONS)

        # Step through every hour up to max_horizon, but only RECORD the ones in FORECAST_HORIZONS
        for step in range(1, max_horizon + 1):
            future_ts = current_time + datetime.timedelta(hours=step)

            # Build the feature row for this step
            step_df = build_one_forecast_step(state, future_ts, feature_names)

            # Predict
            predicted_co = float(aqi_model.predict(step_df)[0])
            predicted_co = max(0.0, predicted_co)  # cap negatives

            # --- Recursive injection: push predicted CO into the history buffer ---
            state['co_history'].append(predicted_co)
            # Keep buffer length reasonable (no need to grow unbounded)
            if len(state['co_history']) > 30:
                state['co_history'].pop(0)

            # Record only the desired horizons
            if step in FORECAST_HORIZONS:
                results.append({
                    "hours_ahead": step,
                    "predicted_timestamp": future_ts.isoformat() + "Z",
                    "predicted_co": round(predicted_co, 4),
                    "predicted_aqi": calculate_co_aqi(predicted_co),
                })

        return results

    except Exception as e:
        logger.error(f"Forecast Pipeline Error: {e}")
        raise ValueError(f"Forecast processing failed: {e}")

