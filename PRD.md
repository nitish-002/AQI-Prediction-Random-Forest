
# OJT - PRODUCT REQUIREMENTS DOCUMENT (PRD)

## AIR QUALITY INDEX (AQI) PREDICTION FOR CITY MONITORING

**Student Name:** Nitish Sharma
**Roll No:** 240410700080
**Year & Section:** 2026 | Track: Data Scientist
**Project Title:** Air Quality Index Prediction for City Monitoring

**Tech Stack:**
React, Recharts, TailwindCSS, FastAPI (Python), scikit-learn, Pandas, NumPy, PostgreSQL, Docker

---

## 1. Problem Understanding

### 1.1 Problem Statement

Urban areas face rising air pollution, but most systems only report current AQI levels instead of predicting future conditions. Without early forecasts, authorities and citizens cannot take timely preventive actions.

This project builds a machine learning-based AQI prediction system using historical sensor data to forecast future air quality and provide actionable insights via an API and dashboard.

---

### 1.2 Why This Problem Matters

* Air pollution impacts health, productivity, and quality of life
* Sudden AQI spikes cause respiratory issues and environmental damage
* Current systems are reactive, not predictive

**Impact:**

* Early warnings
* Better policy decisions
* Smarter traffic & industrial planning
* Informed citizens

---

### 1.3 Data Description

* Source: UCI Machine Learning Repository
* Records: 9,358 hourly entries
* Time Range: March 2004 – Feb 2005
* Data includes:

  * CO, NMHC, Benzene (C₆H₆), NOx, NO₂
  * Sensor readings (PT08 series)
  * Temperature, humidity
* Missing values: `-200`
* Challenges:

  * Sensor drift
  * Cross-sensitivity

---

### 1.5 Inputs & Outputs

| Inputs               | Process                                           | Outputs                 |
| -------------------- | ------------------------------------------------- | ----------------------- |
| Sensor dataset (CSV) | Validation → Cleaning → Feature selection → Model | Predicted AQI           |
| Historical records   | Train-test split → Training → Evaluation          | RMSE, MAE               |
| Real-time data       | API prediction → Store                            | Timestamped predictions |
| Dashboard requests   | Fetch → Visualize                                 | Charts & trends         |

---

## 2. Functional Scope

### 2.1 Core Features (Must-Haves)

* CSV dataset upload
* Data preprocessing (missing values, cleaning)
* Feature selection
* Train Random Forest model
* Display RMSE & MAE
* REST API for predictions
* PostgreSQL storage
* Dashboard:

  * Actual vs Predicted AQI
  * Trends
  * Filters (date & pollutant)
* Export results (CSV)

---

### 2.2 Stretch Goals

* Multi-step forecasting (6–24 hrs)
* Compare ML models (XGBoost, GBM)
* Auto model retraining
* AQI alert system (email/SMS)
* Heatmaps
* Role-based authentication
* Anomaly detection
* Cloud scaling
* SHAP explainability
* Mobile optimization

---

### 2.3 Tools & Libraries

**Frontend:** React, TailwindCSS, Recharts
**Backend:** FastAPI, Uvicorn
**ML:** scikit-learn
**Data:** Pandas, NumPy
**Database:** PostgreSQL
**Deployment:** Docker, Vercel, Render, Hugging Face

---

## 3. System & Design Thinking

### 3.1 Pipeline (from diagram on page 4)

* Data preprocessing
* Feature selection
* Timestamp processing
* Train-test split
* Random Forest training

---

### 3.2 Data Structures & Algorithms

* Pandas DataFrames
* NumPy arrays
* Random Forest (ensemble learning)
* Time-based train-test split
* REST APIs (JSON)
* PostgreSQL tables

---

### 3.3 Testing & Performance

* RMSE, MAE
* Time-based validation
* Residual analysis
* API testing
* Database validation
* Dashboard verification
* Response time monitoring

---

## 4. ML / Analytics Approach

### 4.1 Data Cleaning

* Merge date & time
* Convert to numeric
* Replace `-200` → NaN
* Handle outliers
* Sort chronologically
* Remove duplicates

---

### 4.2 Target Variable

* AQI or pollutant (e.g., NO₂, CO)
* Avoid data leakage
* Align features correctly

---

### 4.3 Model Development

* Random Forest Regressor
* Time-based split
* Hyperparameter tuning
* Compare with Linear Regression
* Save model (`.pkl`)

---

### 4.5 Model Evaluation

* RMSE
* MAE
* R² Score
* Residual analysis
* Time-based testing

---

### 4.7 Deployment Pipeline

* Unified preprocessing + model pipeline
* FastAPI endpoint
* JSON responses
* Prediction + timestamps

---

## 5. Timeline & Milestones

### Month 1

* W1: Setup (Git, FastAPI, DB, Docker)
* W2: Data ingestion
* W3: Data cleaning
* W4: EDA

### Month 2

* W5: Modeling
* W6: Tuning
* W7: Validation
* W8: Backend API

### Month 3

* W9: Frontend setup
* W10: Visualization
* W11: Deployment
* W12: Finalization

---

## 6. Risks & Dependencies

### 6.1 Technical Challenges

* Handling `-200` values
* Time-series feature engineering
* Avoiding data leakage
* API integration
* Low latency

---

### 6.2 Dependencies

* Mentor guidance
* Model tuning feedback
* Feature engineering review
* Deployment support

---

### 6.3 Explainability & Trust

* Feature importance (Random Forest)
* Visual comparisons
* Consistent pipeline
* Stored logs for traceability

---

## 7. Evaluation Readiness

### 7.1 Proof of Working

* End-to-end demo
* Metrics (RMSE, MAE, R²)
* Dashboard charts
* API testing
* DB records
* Deployment links
* GitHub repo

---

### 7.2 Success Metrics

* R² ≥ 0.75
* Low RMSE & MAE
* API response < 500ms
* Fully functional dashboard

---

## 8. Responsibilities

* Dataset analysis
* Feature engineering
* Model training
* Backend API
* Frontend dashboard
* Database integration
* Deployment
* Documentation

---

## 9. Deliverables

### 9.1 Data & EDA

* Clean dataset
* Feature-engineered dataset
* EDA report
* Jupyter Notebook

---

### 9.2 ML Deliverables

* Baseline model report
* Random Forest model
* Evaluation metrics
* Residual analysis
* `.pkl` model

---

### 9.3 Backend

* CSV upload API
* Prediction endpoint
* PostgreSQL integration
* Docker setup

---

### 9.4 Frontend

* Dashboard UI
* AQI charts
* Filters
* API integration

---

### 9.5 Deployment

* Backend (Render)
* Frontend (Vercel)
* Dockerfile
* Env configs
* CI/CD (optional)

---

## Signatures

**Student:**
**Mentor:**
**Date:**

