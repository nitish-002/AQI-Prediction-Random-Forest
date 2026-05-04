# FastAPI Architecture Explained (AQI-Prediction-Random-Forest)

This document explains how FastAPI is used in this project in a beginner-friendly way, while still being technically accurate.

---

## 1) Project Overview

### What the FastAPI app is doing at a high level

This backend exposes HTTP APIs for an AQI (Air Quality Index) prediction system.

At a high level, the FastAPI app handles:

1. Admin login and admin creation.
2. CSV upload and dataset validation.
3. Triggering model retraining in the background.
4. Real-time AQI prediction from live sensor inputs.
5. Multi-step AQI forecasting (+1h, +3h, +6h, +12h).
6. Historical and analytics endpoints for frontend charts.

So conceptually, it is a service layer that sits between:

- Frontend clients (React/Vite app)
- Database (PostgreSQL by default, SQLite fallback)
- ML components (feature engineering + trained Random Forest model)

### How the application is structured

Main backend files:

- `BACKEND/main.py`: FastAPI app creation, middleware, app startup wiring.
- `BACKEND/routes.py`: All endpoint definitions (via `APIRouter`).
- `BACKEND/models.py`: SQLAlchemy ORM tables + Pydantic request/response schemas.
- `BACKEND/database.py`: DB engine/session configuration and `get_db` dependency.
- `BACKEND/ml_service.py`: Model loading + predict/forecast orchestration.
- `BACKEND/feature_engineering.py`: Feature creation from current + historical sensor data.
- `BACKEND/training_service.py`: Dataset validation + retraining pipeline + metrics.

Entry point:

- The app instance is `app` in `BACKEND/main.py`.
- Uvicorn startup block is provided in the same file under `if __name__ == "__main__":`.

---

## 2) Application Setup

### How FastAPI is initialized

In `BACKEND/main.py`:

- `app = FastAPI(title=..., description=..., version=...)`

This creates the ASGI application object. The metadata appears in auto-generated docs:

- Swagger UI: `/docs`
- ReDoc: `/redoc`

### Important configuration

#### CORS middleware

The app adds:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Theory:

- Browsers block cross-origin requests unless CORS allows them.
- FastAPI itself does not enforce browser CORS; browser does.
- `allow_origins=["*"]` means any origin can call the API.

Project implication:

- Good for MVP/testing convenience.
- For production, tighten this to known frontend domains.

#### Database table creation at startup import time

`models.Base.metadata.create_all(bind=engine)` runs in `main.py` before app starts.

Theory:

- SQLAlchemy inspects ORM models and creates missing tables.
- Convenient in development.

Project implication:

- Fast bootstrap for local development.
- In mature production systems, migrations (Alembic) are usually preferred.

#### Environment configuration

In `database.py`:

- `.env` is loaded with `load_dotenv()`.
- `DATABASE_URL` is read from env, with fallback URL.

This allows changing DB connection without changing code.

---

## 3) Routing & Endpoints

### How routes are organized

- Routes are centralized in one file: `BACKEND/routes.py`.
- A single router object (`router = APIRouter()`) is included in `main.py` via `app.include_router(router)`.

Theory:

- `APIRouter` helps modularize endpoints.
- Larger projects usually split routers by domain (auth/router, prediction/router, admin/router, etc.).

Current design is valid and simple for a small/medium codebase.

### Key endpoints and examples

#### Health and root

- `GET /` returns a service-running message.
- `GET /health` checks app health and whether model is loaded (`aqi_model is not None`).

#### Auth/Admin

- `POST /login`
- `POST /add-admin`

`/login` behavior:

- Special hardcoded developer shortcut (`admin@gmail.com` + `admin`)
- Otherwise DB lookup from `Admin` table + PBKDF2 hash verification.

#### Data/training lifecycle

- `POST /upload-csv`: Upload dataset file to `BACKEND/data/uploaded_dataset.csv`
- `POST /validate-data`: Validate schema/timestamps/missing values
- `POST /train-model`: Start background retraining
- `GET /model-metrics`: Return saved training metrics

#### Prediction endpoints

- `POST /predict`: one prediction + DB persistence
- `POST /forecast`: recursive multi-horizon forecast + DB persistence
- `POST /batch-predict`: multiple predictions in one request

#### Analytics/history endpoints

- `GET /forecast-history`
- `GET /aqi-trends`
- `GET /aqi-comparison`
- `GET /aqi-filter?pollutant=co&start_date=...&end_date=...`

### How params/body are handled in this project

FastAPI parameter theory:

- Path params: values in URL path (example `/items/{id}`)
- Query params: values after `?`, like `?limit=20`
- Request body: JSON body validated by Pydantic model

Project examples:

1. Request body (Pydantic)
   - `/predict` takes `request: models.PredictRequest`
2. Query params
   - `/forecast-history` uses `limit: int = 20`
   - `/aqi-filter` uses `pollutant`, `start_date`, `end_date`
3. File upload
   - `/upload-csv` uses `file: UploadFile = File(...)`

Why this is nice in FastAPI:

- Type hints + Pydantic give automatic parsing, validation, and OpenAPI docs.

---

## 4) Data Validation & Models

### How Pydantic models are used

In `BACKEND/models.py`, Pydantic schemas include:

- `LoginRequest`, `LoginResponse`
- `AddAdminRequest`
- `PredictRequest`, `PredictResponse`
- `BatchPredictRequest`
- `ValidateDataResponse`
- `ModelMetricsResponse`
- `ForecastPoint`, `ForecastResponse`

Theory:

- Pydantic validates incoming JSON against schema types.
- If input is wrong type/missing required field, FastAPI returns `422 Unprocessable Entity` automatically.
- `response_model=...` filters/validates output shape.

Project example:

```python
@router.post("/predict", response_model=models.PredictResponse)
async def predict_aqi(request: models.PredictRequest, db: Session = Depends(get_db)):
    ...
```

This means:

- Input must match `PredictRequest`.
- Output must match `PredictResponse`.

### Why request/response schemas are structured this way

- Request schema keeps API contract stable for frontend.
- Response schema avoids leaking internal fields from DB/ML objects.
- Optional sensor fields support partial payloads while preserving model compatibility.

The project separates SQLAlchemy models (DB layer) from Pydantic models (API contract layer), which is a strong design choice.

---

## 5) Dependency Injection

### Use of `Depends()`

The project uses dependency injection for DB sessions:

```python
db: Session = Depends(get_db)
```

`get_db()` in `database.py`:

- Opens session
- Yields session to endpoint
- Closes session in `finally`

Theory:

- FastAPI dependency system handles lifecycle and reuse of shared logic.
- This keeps endpoint code cleaner and prevents DB session leaks.

### Authentication/shared logic notes

- Authentication is custom/manual currently (not FastAPI Security utilities yet).
- Password hashing/verifying is done in helper functions inside `routes.py`.
- Token generation exists but token storage/verification middleware is not fully implemented.
- `Header` is imported but currently not used in active endpoint security checks.

---

## 6) Database Integration

### How DB connection works

Database stack:

- SQLAlchemy ORM (`create_engine`, `sessionmaker`, declarative models)
- PostgreSQL default connection URL from env
- SQLite fallback branch if URL is not PostgreSQL

ORM tables:

- `SensorData`
- `PredictionRecord`
- `ForecastRecord`
- `Admin`

### Lifecycle of a request involving DB

Example: `POST /predict`

1. FastAPI validates request body into `PredictRequest`.
2. `get_db` injects SQLAlchemy session.
3. Endpoint writes sensor input to `SensorData` and commits.
4. Endpoint calls ML service (`make_prediction`) using DB context for history.
5. Endpoint computes AQI from predicted CO.
6. Endpoint saves result in `PredictionRecord` and commits.
7. Endpoint returns API response.

Important theory:

- SQLAlchemy session is unit-of-work style.
- `db.add`, `db.commit`, `db.refresh` are transaction operations.

---

## 7) Business Logic Flow

### End-to-end flow for prediction request

For `POST /predict`, flow is:

1. HTTP request reaches FastAPI route in `routes.py`.
2. FastAPI parses JSON -> `PredictRequest` object.
3. DB dependency provides `Session`.
4. Current sensor reading is persisted.
5. `ml_service.make_prediction` is called.
6. `ml_service` ensures latest model is loaded (`load_latest_model`).
7. `feature_engineering.build_features` constructs model-aligned feature vector using:
   - historical DB records
   - time features
   - lag/rolling features
   - synthesized PT08-related values when needed
8. Random Forest predicts CO value.
9. `aqi_calculator.calculate_co_aqi` converts CO to AQI via breakpoint interpolation.
10. Prediction record is saved to DB.
11. API sends structured JSON response.

### Forecast flow (advanced)

For `POST /forecast`:

1. Persist current reading.
2. Initialize rolling history (`init_forecast_state`).
3. For each hour step up to 12h:
   - build one-step features
   - predict CO
   - feed predicted CO back into history (recursive forecasting)
4. Keep only horizon outputs (1, 3, 6, 12).
5. Save each forecast point to `ForecastRecord`.
6. Return grouped forecast response.

This is a recursive multi-step strategy, not direct multi-output forecasting.

---

## 8) Advanced Features (Present or Not)

### Present

1. Background tasks
   - `/train-model` uses FastAPI `BackgroundTasks`.
   - Retraining runs after response returns, so the API stays responsive.

2. Middleware
   - CORS middleware is configured globally.

3. Response models
   - Multiple endpoints use strict response schemas.

4. File uploads
   - CSV upload via `UploadFile` + `File(...)`.

### Not present (currently)

1. WebSockets
2. Startup/shutdown event handlers (`@app.on_event` or lifespan context)
3. FastAPI security dependencies (`OAuth2PasswordBearer`, JWT workflow)
4. Request-scoped logging middleware / correlation IDs

---

## 9) Best Practices & Design Choices

### Good design choices already in the project

1. Clear separation of concerns
   - API layer, DB layer, ML service, feature engineering, training service are separated.

2. Typed schemas
   - Pydantic contracts improve reliability and docs.

3. Dependency-based DB session handling
   - Prevents manual session management mistakes in routes.

4. Non-blocking retraining trigger
   - Background task avoids freezing request thread.

5. Health endpoint
   - Useful for monitoring/deployment checks.

### Potential issues and improvements

1. Security hardening needed
   - Hardcoded admin login bypass should be removed.
   - Generated tokens are not persisted/validated server-side.
   - Add proper auth (JWT + expiry + role checks).

2. Router modularity
   - `routes.py` is growing large; split by domain:
     - auth routes
     - training routes
     - prediction routes
     - analytics routes

3. Error consistency
   - Standardize error response format across endpoints.

4. Input validation depth
   - Add constraints (e.g., pollutant ranges, date parsing with typed datetime query params).

5. Data/date filtering robustness
   - `aqi_filter` uses string date comparisons; better to parse into datetime types.

6. Migrations
   - Replace `create_all` with Alembic for controlled schema evolution.

7. Training observability
   - Persist training status and progress, not just fire-and-forget.

8. Performance/scalability
   - For heavier ML retraining/inference, consider a task queue (Celery/RQ) and separate workers.

---

## 10) Simple Summary (Junior Developer Version)

Think of this FastAPI backend as an orchestrator:

1. FastAPI receives requests.
2. Pydantic checks data shape/types.
3. FastAPI injects a DB session via `Depends(get_db)`.
4. Route functions call service functions (ML + feature engineering).
5. SQLAlchemy stores and reads history/predictions.
6. FastAPI returns clean JSON responses to frontend.

In short:

- FastAPI gives routing, validation, dependency injection, and automatic API docs.
- SQLAlchemy handles persistence.
- Service modules hold domain logic (prediction/training/features).
- The project already has a solid base and can be upgraded with stronger auth, modular routers, and migration tooling.

---

## Bonus: Mini Theory Cheatsheet

### Why FastAPI feels clean

FastAPI builds on Python type hints.

- Type hints -> validation + docs + editor support.
- Dependencies -> reusable request-scoped resources.
- `response_model` -> explicit API contract.

### Request handling model (mental model)

For each request:

1. Match route.
2. Parse inputs (path/query/body/file/header).
3. Resolve dependencies (`Depends`).
4. Run endpoint function.
5. Validate/serialize response.
6. Return HTTP response.

### Async note for this project

Endpoints are declared `async def`, but DB and ML logic are largely synchronous.
That is acceptable for many projects, but CPU-heavy work should stay off request path or move to workers/background systems as load grows.
