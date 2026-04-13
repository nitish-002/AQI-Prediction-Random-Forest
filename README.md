# AQI Prediction System

## Overview
The AQI (Air Quality Index) Prediction System is a comprehensive full-stack application that leverages advanced machine learning techniques to forecast air quality. The system integrates a React-based frontend for visual analytics, a FastAPI backend for robust data processing and API serving, and a PostgreSQL database for reliable data storage. The core prediction engine employs extensive time-series feature engineering and evaluates multiple regression models, including Random Forest and XGBoost, to deliver high-accuracy AQI forecasts.

## Features
- **Advanced Machine Learning**: Utilizes sophisticated time-series feature engineering (cyclical encoding, lag features, rolling windows) to achieve an $R^2$ score of ~0.93. Models evaluated include Linear Regression, Random Forest, Gradient Boosting, and XGBoost.
- **Interactive Dashboard (React)**: Visualizes AQI trends, compares actual vs. predicted values, and allows CSV data uploads and customized filtering.
- **Robust API (FastAPI)**: Modular backend handling data upload, preprocessing, model training, prediction, and analytics.
- **Relational Database**: Stores sensor data, processed features, model metadata, and predictions.

## Project Structure
- `ML-Model/`: Contains Jupyter Notebooks (e.g., `RFModel.ipynb`) for exploratory data analysis (EDA), feature engineering, and model training.
- `SystemDesign.md`: Low-level design documentation outlining the frontend, backend, database schema, and data flows.
- `EDA & featureEngineering.md`: Details the professional EDA, missing value imputation (Linear Interpolation), and the rationale behind the advanced feature engineering that boosted model accuracy.
- `APIContracts.md` / `FeatureBreakdown.md`: Additional documentation for system integration and feature sets.
- `requirements.txt`: Python package dependencies.

## Data Preprocessing & Feature Engineering
- **Imputation**: Missing values replaced via Linear Interpolation to preserve temporal continuity.
- **Time-Series Logic**: Extraction of cyclical temporal features (Hour, DayOfWeek, Month) using sine/cosine transformations.
- **Lag & Rolling Windows**: Deep lagged features and moving averages (3, 6, 12, 24-hour) for pollutants and weather variables.
- **Interactions**: Compound environmental features (e.g., Temperature-Humidity interactions).

## Tech Stack
- **Frontend**: React.js
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL
- **Machine Learning**: Scikit-Learn, XGBoost, Pandas, NumPy
- **Environment**: Jupyter Notebooks for experimentation

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js & npm (for the frontend)
- PostgreSQL database

### Installation
1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd AQI-Prediction-Random-Forest
   ```

2. **Set up the Python Virtual Environment:**
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Backend (FastAPI):**
   Navigate to the backend directory and start the server:
   ```bash
   uvicorn main:app --reload
   ```

5. **Run the Frontend (React):**
   Navigate to the frontend directory:
   ```bash
   npm install
   npm start
   ```

## Future Enhancements
- Fine-tune tree-based models (XGBoost, Random Forest) using `GridSearchCV` or `RandomizedSearchCV`.
- Implement rolling Time-Series Cross-Validation for enhanced robustness.
