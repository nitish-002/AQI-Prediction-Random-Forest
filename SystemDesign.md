
# AQI Prediction System — Low Level Design (LLD)

---

## Frontend Layer (React)

### Modules

#### Dashboard Module

Displays:

* AQI trends
* Actual vs Predicted AQI
* Filters (Date / Pollutant)

---

### Components

* `DashboardPage.jsx`
* `AQITrendChart.jsx`
* `PredictionComparisonChart.jsx`
* `FilterPanel.jsx`
* `UploadCSV.jsx`

---

### API Client

Handles communication with backend

```
services/
└── api.js
```

Functions:

* `uploadCSV()`
* `getPredictions()`
* `getTrends()`
* `predictAQI()`

---

## Backend Layer (FastAPI)

### Folder Structure

```
backend/
│
├── main.py
│
├── routers/
│   ├── upload.py
│   ├── predict.py
│   ├── train.py
│   ├── analytics.py
│
├── services/
│   ├── preprocessing_service.py
│   ├── training_service.py
│   ├── prediction_service.py
│   ├── analytics_service.py
│
├── models/
│   └── rf_model.pkl
│
├── db/
│   ├── database.py
│   ├── models.py
│   ├── crud.py
│
└── schemas/
    ├── request_schema.py
    └── response_schema.py
```

---

## Core Modules

### Upload Module

**Endpoint**

```
POST /upload-csv
```

Flow:

```
upload.py → preprocessing_service → DB save
```

---

### Preprocessing Module

File: `preprocessing_service.py`

Responsibilities:

* Convert datetime
* Feature engineering
* Prepare ML-ready dataset

Functions:

* `clean_data()`
* `create_features()`
* `prepare_training_data()`

---

### Training Module

**Endpoint**

```
POST /train-model
```

File: `training_service.py`

Functions:

* `train_model()`
* `evaluate_model()`
* `save_model()`

Uses:

* `RandomForestRegressor`

Output:

* `rf_model.pkl`

---

### Prediction Module

**Endpoint**

```
POST /predict
```

File: `prediction_service.py`

Functions:

* `load_model()`
* `predict_aqi()`
* `store_prediction()`

---

### Analytics Module

**Endpoints**

```
GET /aqi-trends
GET /aqi-comparison
```

File: `analytics_service.py`

Functions:

* `fetch_trends()`
* `actual_vs_predicted()`

---

## Database Design (PostgreSQL)

### sensor_data

| Field     | Type     |
| --------- | -------- |
| id        | UUID     |
| timestamp | DATETIME |
| co        | FLOAT    |
| nox       | FLOAT    |
| no2       | FLOAT    |
| temp      | FLOAT    |
| humidity  | FLOAT    |

---

### processed_data

| Field     | Type |
| --------- | ---- |
| id        | UUID |
| sensor_id | FK   |
| features  | JSON |

---

### model_metadata

| Field      | Type      |
| ---------- | --------- |
| id         | UUID      |
| model_name | TEXT      |
| rmse       | FLOAT     |
| mae        | FLOAT     |
| r2         | FLOAT     |
| created_at | TIMESTAMP |

---

### predictions

| Field         | Type     |
| ------------- | -------- |
| id            | UUID     |
| timestamp     | DATETIME |
| predicted_aqi | FLOAT    |
| model_id      | FK       |

---

## Internal Service Flow

### Training Flow

```
upload_csv()
↓
preprocess_data()
↓
train_model()
↓
evaluate_model()
↓
save_model()
```

---

### Prediction Flow

```
receive_input()
↓
load_model()
↓
predict_aqi()
↓
store_prediction()
```

---

### Dashboard Flow

```
fetch_predictions()
↓
fetch_actual_data()
↓
generate_trends()
```

---

## Class-Level Design

### ModelTrainer

* `train(X, y)`
* `evaluate(X_test, y_test)`
* `save_model(path)`

### AQIPredictor

* `load_model()`
* `predict(data)`

### DataProcessor

* `transform(data)`
* `feature_engineering(data)`

---

## End-to-End Runtime Flow

```
React Upload
    ↓
FastAPI Upload
    ↓
Preprocess
    ↓
Store
    ↓
Train
    ↓
Save Model
    ↓
React Predict
    ↓
FastAPI Predict
    ↓
Load Model
    ↓
Predict
    ↓
Store
    ↓
Dashboard Fetch
    ↓
Charts
```

---

