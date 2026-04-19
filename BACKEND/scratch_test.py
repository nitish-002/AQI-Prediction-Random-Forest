import pandas as pd
import numpy as np

# Simulate a 1-row df
data_list = [{
    'CO(GT)': 2.6,
    'NOx(GT)': 150,
    'NO2(GT)': 90,
    'T': 25,
    'RH': 45,
    'AH': 0.8,
    'Hour': 12,
    'DayOfWeek': 1,
    'Month': 4
}]
df = pd.DataFrame(data_list)

lag_steps = [1, 2, 3, 4, 6]
for lag in lag_steps:
    df[f'CO_lag_{lag}'] = df['CO(GT)'].shift(lag)

# We can fillna by column explicitly
for col in df.columns:
    if df[col].isnull().all():
        if col.startswith('CO_lag_'):
            df[col] = df['CO(GT)']
        elif col.startswith('NOx_lag_') or col.startswith('NOx_roll_'):
            df[col] = df['NOx(GT)']
        elif col.startswith('NO2_lag_') or col.startswith('NO2_roll_'):
            df[col] = df['NO2(GT)']
        elif col.startswith('T_roll_'):
            df[col] = df['T']
        elif col.startswith('RH_roll_'):
            df[col] = df['RH']
        elif col.startswith('AH_roll_'):
            df[col] = df['AH']

print("\nAfter manual fill:")
print(df[[f'CO_lag_{lag}' for lag in lag_steps]])
