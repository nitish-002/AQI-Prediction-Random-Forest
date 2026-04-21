import pandas as pd
import numpy as np
import datetime
from sqlalchemy.orm import Session
import models
from typing import List

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
            'AH': r.abs_humidity if hasattr(r, 'abs_humidity') and r.abs_humidity is not None else 0.0,
            'PT08_S1_CO': r.pt08_s1_co,
            'C6H6_GT': r.c6h6_gt,
            'PT08_S2_NMHC': r.pt08_s2_nmhc,
            'PT08_S3_NOx': r.pt08_s3_nox,
            'PT08_S4_NO2': r.pt08_s4_no2,
            'PT08_S5_O3': r.pt08_s5_o3,
            'NMHC_GT': r.nmhc_gt
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

    # 5. Interaction Terms
    df['T_RH_interaction'] = df['T'] * df['RH']

    # Normally df.dropna(inplace=True) is here, but since we are predicting the LAST row, 
    # we don't want to drop the last row if it has NaNs due to insufficient history (e.g. only 1 record exists).
    # Filling with 0.0 drastically pulls down predictions on a fresh DB. 
    # Instead, we carefully propagate the current readings backward.
    for col in df.columns:
        if df[col].isnull().any():
            if col.startswith('CO_lag_'):
                df[col] = df[col].fillna(df['CO(GT)'].iloc[-1])
            elif col.startswith('NOx_lag_') or col.startswith('NOx_roll_'):
                df[col] = df[col].fillna(df['NOx(GT)'].iloc[-1])
            elif col.startswith('NO2_lag_') or col.startswith('NO2_roll_'):
                df[col] = df[col].fillna(df['NO2(GT)'].iloc[-1])
            elif col.startswith('T_roll_'):
                df[col] = df[col].fillna(df['T'].iloc[-1])
            elif col.startswith('RH_roll_'):
                df[col] = df[col].fillna(df['RH'].iloc[-1])
            elif col.startswith('AH_roll_'):
                df[col] = df[col].fillna(df['AH'].iloc[-1])
                
    # Any remaining NaNs (like standard bfill/ffill) safely addressed
    df.bfill(inplace=True)
    df.ffill(inplace=True)
    df.fillna(0.0, inplace=True)
    # --- USER'S EXACT PANDAS CODE END ---

    # Extract the very last row, which represents the current prediction state
    last_row = df.iloc[-1:]
    
    # Now, align it precisely with the model's expected 212 features
    final_features_df = pd.DataFrame(index=[0], columns=feature_names_in)
    
    # The model relies heavily on internal PT08 sensor readings. Holding these constant at median 
    # blocks the Random Forest from recognizing real changes, pulling predictions artificially toward the mean.
    # We dynamically synthesize these offline sensor values inversely/directly proportionate to actual inputs.
    current_co = df['CO(GT)'].iloc[-1]
    current_nox = df['NOx(GT)'].iloc[-1]
    current_no2 = df['NO2(GT)'].iloc[-1]

    stable_baseline_sensors = {
        'PT08.S1(CO)': current_data.get('pt08_s1_co') or max(800.0, 800.0 + (current_co * 150.0)),
        'C6H6(GT)': current_data.get('c6h6_gt') or max(1.0, current_co * 4.0),
        'PT08.S2(NMHC)': current_data.get('pt08_s2_nmhc') or max(600.0, 700.0 + (current_co * 80.0)),
        'PT08.S3(NOx)': current_data.get('pt08_s3_nox') or max(400.0, 1500.0 - (current_nox * 2.0)),
        'PT08.S4(NO2)': current_data.get('pt08_s4_no2') or max(800.0, 1000.0 + (current_no2 * 2.5)),
        'PT08.S5(O3)': current_data.get('pt08_s5_o3') or max(500.0, 800.0 + (current_no2 * 1.5)),
        'NMHC(GT)': current_data.get('nmhc_gt') or max(100.0, current_co * 100.0)
    }
    
    # Populate the columns we have constructed
    for col in final_features_df.columns:
        if col in last_row.columns:
            final_features_df[col] = last_row[col].values
        else:
            # Drop in stable sensor baselines if it's an offline sensor, otherwise fallback to 0.0
            final_features_df[col] = stable_baseline_sensors.get(col, 0.0)
            
    return final_features_df


def init_forecast_state(
    db: Session,
    current_timestamp: datetime.datetime,
    current_data: dict,
) -> dict:
    """
    Builds the rolling history buffers needed for recursive forecasting.
    Must be called once before iterating over future steps.

    Returns a state dict containing:
      - co_history, nox_history, no2_history  (last 6 values)
      - t_history, rh_history, ah_history     (last 24 values)
      - stable_baseline_sensors               (synthesised PT08 etc.)
    """
    historical_records = db.query(models.SensorData) \
        .order_by(models.SensorData.timestamp.desc()) \
        .limit(30).all()
    historical_records = historical_records[::-1]

    data_list = []
    for r in historical_records:
        data_list.append({
            'timestamp': r.timestamp,
            'CO(GT)':  r.co,
            'NOx(GT)': r.nox,
            'NO2(GT)': r.no2,
            'T':  r.temperature,
            'RH': r.humidity,
            'AH': r.abs_humidity if hasattr(r, 'abs_humidity') and r.abs_humidity is not None else 0.0,
        })

    # Append current reading as the t=0 anchor
    data_list.append({
        'timestamp': current_timestamp,
        'CO(GT)':  current_data.get('co', 0.0),
        'NOx(GT)': current_data.get('nox', 0.0),
        'NO2(GT)': current_data.get('no2', 0.0),
        'T':  current_data.get('temperature', 0.0),
        'RH': current_data.get('humidity', 0.0),
        'AH': current_data.get('abs_humidity', 0.0),
    })

    base_df = pd.DataFrame(data_list).set_index('timestamp')
    for col in ['CO(GT)', 'NOx(GT)', 'NO2(GT)', 'T', 'RH', 'AH']:
        if col not in base_df.columns:
            base_df[col] = 0.0

    current_co  = current_data.get('co', 0.0)
    current_nox = current_data.get('nox', 0.0)
    current_no2 = current_data.get('no2', 0.0)

    return {
        # Rolling buffers – keep up to the last 24 records (oldest→newest)
        'co_history':  list(base_df['CO(GT)'].values[-24:]),
        'nox_history': list(base_df['NOx(GT)'].values[-24:]),
        'no2_history': list(base_df['NO2(GT)'].values[-24:]),
        't_history':   list(base_df['T'].values[-24:]),
        'rh_history':  list(base_df['RH'].values[-24:]),
        'ah_history':  list(base_df['AH'].values[-24:]),
        'stable_baseline_sensors': {
            'PT08.S1(CO)':   current_data.get('pt08_s1_co')   or max(800.0, 800.0 + (current_co  * 150.0)),
            'C6H6(GT)':      current_data.get('c6h6_gt')       or max(1.0,   current_co  * 4.0),
            'PT08.S2(NMHC)': current_data.get('pt08_s2_nmhc') or max(600.0, 700.0 + (current_co  * 80.0)),
            'PT08.S3(NOx)':  current_data.get('pt08_s3_nox')  or max(400.0, 1500.0 - (current_nox * 2.0)),
            'PT08.S4(NO2)':  current_data.get('pt08_s4_no2')  or max(800.0, 1000.0 + (current_no2 * 2.5)),
            'PT08.S5(O3)':   current_data.get('pt08_s5_o3')   or max(500.0, 800.0  + (current_no2 * 1.5)),
            'NMHC(GT)':      current_data.get('nmhc_gt')      or max(100.0, current_co * 100.0),
        },
    }


def build_one_forecast_step(
    state: dict,
    future_ts: datetime.datetime,
    feature_names_in: list,
) -> pd.DataFrame:
    """
    Builds the feature DataFrame for a SINGLE future time step.

    `state` is the mutable dict returned by init_forecast_state().
    After each call, the caller must append the predicted CO value to
    state['co_history'] before calling this function for the next step.
    """
    lag_steps        = [1, 2, 3, 4, 6]
    windows          = [3, 6, 12, 24]
    pollutant_windows = [3, 6]

    co_history  = state['co_history']
    nox_history = state['nox_history']
    no2_history = state['no2_history']
    t_history   = state['t_history']
    rh_history  = state['rh_history']
    ah_history  = state['ah_history']
    stable      = state['stable_baseline_sensors']

    row: dict = {}

    # Temporal features
    row['Hour']       = future_ts.hour
    row['DayOfWeek']  = future_ts.weekday()
    row['Month']      = future_ts.month
    row['Is_Weekend'] = 1 if row['DayOfWeek'] >= 5 else 0

    # Cyclical encoding
    row['Hour_sin']      = np.sin(2 * np.pi * row['Hour']      / 23.0)
    row['Hour_cos']      = np.cos(2 * np.pi * row['Hour']      / 23.0)
    row['DayOfWeek_sin'] = np.sin(2 * np.pi * row['DayOfWeek'] / 6.0)
    row['DayOfWeek_cos'] = np.cos(2 * np.pi * row['DayOfWeek'] / 6.0)
    row['Month_sin']     = np.sin(2 * np.pi * row['Month']     / 12.0)
    row['Month_cos']     = np.cos(2 * np.pi * row['Month']     / 12.0)

    # Lag features — co_history[-1] is the most recently predicted/known CO
    for lag in lag_steps:
        row[f'CO_lag_{lag}']  = co_history[-lag]  if len(co_history)  >= lag else co_history[0]
        row[f'NOx_lag_{lag}'] = nox_history[-lag] if len(nox_history) >= lag else nox_history[0]
        row[f'NO2_lag_{lag}'] = no2_history[-lag] if len(no2_history) >= lag else no2_history[0]

    # Rolling averages over history buffers
    for w in windows:
        row[f'T_roll_{w}']  = float(np.mean(t_history[-w:]  if len(t_history)  >= w else t_history))
        row[f'RH_roll_{w}'] = float(np.mean(rh_history[-w:] if len(rh_history) >= w else rh_history))
        row[f'AH_roll_{w}'] = float(np.mean(ah_history[-w:] if len(ah_history) >= w else ah_history))

    for w in pollutant_windows:
        row[f'NOx_roll_{w}'] = float(np.mean(nox_history[-w:] if len(nox_history) >= w else nox_history))
        row[f'NO2_roll_{w}'] = float(np.mean(no2_history[-w:] if len(no2_history) >= w else no2_history))

    # Interaction term
    row['T_RH_interaction'] = t_history[-1] * rh_history[-1]

    # Raw base features (latest known values propagated)
    row['CO(GT)']  = co_history[-1]
    row['NOx(GT)'] = nox_history[-1]
    row['NO2(GT)'] = no2_history[-1]
    row['T']       = t_history[-1]
    row['RH']      = rh_history[-1]
    row['AH']      = ah_history[-1]

    # Align to the model's expected feature columns
    final_df = pd.DataFrame(index=[0], columns=feature_names_in)
    for col in final_df.columns:
        final_df[col] = row.get(col, stable.get(col, 0.0))

    return final_df.fillna(0.0)
