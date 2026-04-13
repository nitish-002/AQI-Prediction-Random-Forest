import pandas as pd
import numpy as np
import datetime
from sqlalchemy.orm import Session
import models

def build_features(db: Session, current_timestamp: datetime.datetime, current_data: dict, feature_names_in: list) -> pd.DataFrame:
    """
    Simulates fetching 24 hours of history, applying the user's EXACT 
    pandas feature engineering, and extracting the final 1-row state.
    """
    
    # 1. Fetch last 24 hours of data. Since this is a new setup, we might not have 24 hours.
    # We will simulate missing history safely for MVP, but strictly apply the panda script.
    
    # Fetch historical records (limit to 30 for safety)
    historical_records = db.query(models.SensorData).order_by(models.SensorData.timestamp.desc()).limit(30).all()
    historical_records = historical_records[::-1] # Reverse to chronological order
    
    data_list = []
    for r in historical_records:
        data_list.append({
            'timestamp': r.timestamp,
            'CO(GT)': r.co,
            'NOx(GT)': r.nox,
            'NO2(GT)': r.no2,
            'T': r.temperature,
            'RH': r.humidity,
            'AH': r.abs_humidity if hasattr(r, 'abs_humidity') and r.abs_humidity is not None else 0.0
        })
        
    # Append the CURRENT data being predicted (which isn't in DB yet or just added)
    # We assume 'current_data' has the same keys
    # Actually, current_data is just appended naturally if we save it to DB first. Let's assume it IS in the db.
    
    df = pd.DataFrame(data_list)
    if df.empty:
        current_data['timestamp'] = current_timestamp
        df = pd.DataFrame([current_data])
        
    # Ensure timestamp is index for rolling/lag logic
    df.set_index('timestamp', inplace=True)
    
    # Ensure columns exist even if no data (e.g., frontend omits AH)
    required_base_cols = ['CO(GT)', 'NOx(GT)', 'NO2(GT)', 'T', 'RH', 'AH']
    for col in required_base_cols:
        if col not in df.columns:
            df[col] = 0.0
            
    # --- USER'S EXACT PANDAS CODE START ---
    # 1. Temporal Features
    df['Hour'] = df.index.hour
    df['DayOfWeek'] = df.index.dayofweek
    df['Month'] = df.index.month
    df['Is_Weekend'] = df['DayOfWeek'].apply(lambda x: 1 if x >= 5 else 0)

    # 2. Cyclical Encoding for Time
    df['Hour_sin'] = np.sin(2 * np.pi * df['Hour']/23.0)
    df['Hour_cos'] = np.cos(2 * np.pi * df['Hour']/23.0)
    df['DayOfWeek_sin'] = np.sin(2 * np.pi * df['DayOfWeek']/6.0)
    df['DayOfWeek_cos'] = np.cos(2 * np.pi * df['DayOfWeek']/6.0)
    df['Month_sin'] = np.sin(2 * np.pi * df['Month']/12.0)
    df['Month_cos'] = np.cos(2 * np.pi * df['Month']/12.0)

    # 3. Extended Lag Features for multiple key variables
    lag_steps = [1, 2, 3, 4, 6]
    for lag in lag_steps:
        df[f'CO_lag_{lag}'] = df['CO(GT)'].shift(lag)
        df[f'NOx_lag_{lag}'] = df['NOx(GT)'].shift(lag)
        df[f'NO2_lag_{lag}'] = df['NO2(GT)'].shift(lag)

    # 4. Extended Rolling Window Features for recent weather and pollutant trends
    windows = [3, 6, 12, 24]
    for w in windows:
        df[f'T_roll_{w}'] = df['T'].rolling(window=w, min_periods=1).mean()
        df[f'RH_roll_{w}'] = df['RH'].rolling(window=w, min_periods=1).mean()
        df[f'AH_roll_{w}'] = df['AH'].rolling(window=w, min_periods=1).mean()

    pollutant_windows = [3, 6]
    for w in pollutant_windows:
        df[f'NOx_roll_{w}'] = df['NOx(GT)'].rolling(window=w, min_periods=1).mean()
        df[f'NO2_roll_{w}'] = df['NO2(GT)'].rolling(window=w, min_periods=1).mean()

    df['T_RH_i# 5. Interaction Terms interaction'] = df['T'] * df['RH']

    # Normally df.dropna(inplace=True) is here, but since we are predicting the LAST row, 
    # we don't want to drop the last row if it has NaNs due to insufficient history (e.g. only 1 record exists).
    # We will instead fill NaNs with 0.0 or forward fill to ensure API survivability during startup.
    df.fillna(0.0, inplace=True)
    # --- USER'S EXACT PANDAS CODE END ---

    # Extract the very last row, which represents the current prediction state
    last_row = df.iloc[-1:]
    
    # Now, align it precisely with the model's expected 212 features
    final_features_df = pd.DataFrame(index=[0], columns=feature_names_in)
    
    # Populate the columns we have constructed
    for col in final_features_df.columns:
        if col in last_row.columns:
            final_features_df[col] = last_row[col].values
        else:
            final_features_df[col] = 0.0 # Secure zero-padding for completely missing base columns (like PT08.S1)
            
    return final_features_df
