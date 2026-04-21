import pandas as pd
import numpy as np
import joblib
import json
import os

print("Loading data...")
file_path = r"C:\Users\ACER\Downloads\air+quality (1)\AirQualityUCI.csv"
df = pd.read_csv(file_path, sep=';', decimal=',')
df = df.loc[:, ~df.columns.str.contains('^Unnamed')]
df.dropna(how='all', inplace=True)
df['Datetime'] = pd.to_datetime(df['Date'] + ' ' + df['Time'], format='%d/%m/%Y %H.%M.%S', errors='coerce')
df = df.drop(['Date', 'Time'], axis=1)
df.replace(-200, np.nan, inplace=True)
df = df.sort_values('Datetime').reset_index(drop=True)
df.set_index('Datetime', inplace=True)

if 'NMHC(GT)' in df.columns:
    df.drop('NMHC(GT)', axis=1, inplace=True)
df.interpolate(method='linear', limit_direction='both', inplace=True)

df['Hour'] = df.index.hour
df['DayOfWeek'] = df.index.dayofweek
df['Month'] = df.index.month
df['Is_Weekend'] = df['DayOfWeek'].apply(lambda x: 1 if x >= 5 else 0)

df['Hour_sin'] = np.sin(2 * np.pi * df['Hour']/23.0)
df['Hour_cos'] = np.cos(2 * np.pi * df['Hour']/23.0)
df['DayOfWeek_sin'] = np.sin(2 * np.pi * df['DayOfWeek']/6.0)
df['DayOfWeek_cos'] = np.cos(2 * np.pi * df['DayOfWeek']/6.0)
df['Month_sin'] = np.sin(2 * np.pi * df['Month']/12.0)
df['Month_cos'] = np.cos(2 * np.pi * df['Month']/12.0)

lag_steps = [1, 2, 3, 4, 6]
for lag in lag_steps:
    df[f'CO_lag_{lag}'] = df['CO(GT)'].shift(lag)
    df[f'NOx_lag_{lag}'] = df['NOx(GT)'].shift(lag)
    df[f'NO2_lag_{lag}'] = df['NO2(GT)'].shift(lag)

windows = [3, 6, 12, 24]
for w in windows:
    df[f'T_roll_{w}'] = df['T'].rolling(window=w).mean()
    df[f'RH_roll_{w}'] = df['RH'].rolling(window=w).mean()
    df[f'AH_roll_{w}'] = df['AH'].rolling(window=w).mean()

pollutant_windows = [3, 6]
for w in pollutant_windows:
    df[f'NOx_roll_{w}'] = df['NOx(GT)'].rolling(window=w).mean()
    df[f'NO2_roll_{w}'] = df['NO2(GT)'].rolling(window=w).mean()

df['T_RH_i# 5. Interaction Terms interaction'] = df['T'] * df['RH']
df.dropna(inplace=True)

df_temp = df.copy()
target = 'CO(GT)'
features = [col for col in df_temp.columns if col != target]

for col in features:
    if pd.api.types.is_numeric_dtype(df_temp[col]):
        df_temp[f'{col}_lag1'] = df_temp[col].shift(1)
        df_temp[f'{col}_lag2'] = df_temp[col].shift(2)
        df_temp[f'{col}_roll3'] = df_temp[col].rolling(window=3).mean()

df_temp.dropna(inplace=True)
X_adv = df_temp.drop(target, axis=1)
y_adv = df_temp[target]

split_idx = int(len(df_temp) * 0.8)
X_test_adv = X_adv.iloc[split_idx:]
y_test_adv = y_adv.iloc[split_idx:]

print("Loading model...")
model_path = r"c:\Sem 4 projects\AQI-Prediction-Random-Forest\ML-Model\tuned_aqi_model.pkl"
model = joblib.load(model_path)

print("Predicting...")
y_pred_xgb = model.predict(X_test_adv)

# Helper function to convert CO(GT) back to AQI
def calculate_co_aqi(co_concentration):
    # Truncated version of the backend logic or just multiply
    # We will just yield the raw CO values as AQI approx or we can do the real math
    co_ppm = co_concentration
    if co_ppm <= 4.4:
        return int((50 - 0) / (4.4 - 0.0) * (co_ppm - 0.0) + 0)
    elif co_ppm <= 9.4:
        return int((100 - 51) / (9.4 - 4.5) * (co_ppm - 4.5) + 51)
    elif co_ppm <= 12.4:
        return int((150 - 101) / (12.4 - 9.5) * (co_ppm - 9.5) + 101)
    elif co_ppm <= 15.4:
        return int((200 - 151) / (15.4 - 12.5) * (co_ppm - 12.5) + 151)
    elif co_ppm <= 30.4:
        return int((300 - 201) / (30.4 - 15.5) * (co_ppm - 15.5) + 201)
    elif co_ppm <= 40.4:
        return int((400 - 301) / (40.4 - 30.5) * (co_ppm - 30.5) + 301)
    else:
        return int((500 - 401) / (50.4 - 40.5) * (co_ppm - 40.5) + 401)

results = []
# Just take a manageable slice to not crash frontend charts (e.g. 100 points)
subset_y_test = y_test_adv[-100:]
subset_y_pred = y_pred_xgb[-100:]
time_idx = X_test_adv.index[-100:]

for i in range(len(subset_y_test)):
    act = subset_y_test.iloc[i]
    prd = subset_y_pred[i]
    # Bound to >0
    act = max(act, 0)
    prd = max(prd, 0)
    results.append({
        "time": time_idx[i].strftime("%Y-%m-%d %H:00"),
        "actual": calculate_co_aqi(act),
        "predicted": calculate_co_aqi(prd)
    })

out_path = r"c:\Sem 4 projects\AQI-Prediction-Random-Forest\FRONTEND\public\static_test_results.json"
os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, "w") as f:
    json.dump({"trend": results}, f)

print(f"Done! Exported to {out_path}")