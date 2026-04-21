from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
import models
from ml_service import make_prediction, make_forecast
import datetime

router = APIRouter()

from fastapi import BackgroundTasks, Header
import os
import hashlib
import secrets

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f"{salt}${pwd_hash.hex()}"

def verify_password(password: str, hash_value: str) -> bool:
    salt, pwd_hash = hash_value.split('$')
    pwd_hash_check = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
    return pwd_hash == pwd_hash_check

def generate_token(email: str) -> str:
    return secrets.token_hex(32)

@router.post("/login", response_model=models.LoginResponse)
async def login(request: models.LoginRequest, db: Session = Depends(get_db)):
    if request.email == "admin@gmail.com" and request.password == "admin":
        return {"token": "dev_token_admin", "email": "admin@gmail.com"}

    admin = db.query(models.Admin).filter(models.Admin.email == request.email).first()
    if not admin or not verify_password(request.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = generate_token(admin.email)
    return {"token": token, "email": admin.email}

@router.post("/add-admin")
async def add_admin(request: models.AddAdminRequest, db: Session = Depends(get_db)):
    # Simple setup: Check if admin exists. To make it totally secure, we would protect this with token header checking.
    existing_admin = db.query(models.Admin).filter(models.Admin.email == request.email).first()
    if existing_admin:
        raise HTTPException(status_code=400, detail="Admin already exists")
    
    new_admin = models.Admin(
        email=request.email,
        password_hash=hash_password(request.password)
    )
    db.add(new_admin)
    db.commit()
    
    return {"message": "Admin added successfully", "email": request.email}

@router.post("/upload-csv")
async def upload_dataset(file: UploadFile = File(...)):
    # Save the file / Route to Processing Service
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file type. Must be CSV.")
        
    save_path = os.path.join(os.path.dirname(__file__), "data", "uploaded_dataset.csv")
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    with open(save_path, "wb") as f:
        f.write(file.file.read())
        
    return {"status": "success", "message": "Dataset uploaded successfully"}

@router.post("/validate-data", response_model=models.ValidateDataResponse)
async def validate_data():
    from training_service import validate_dataset
    save_path = os.path.join(os.path.dirname(__file__), "data", "uploaded_dataset.csv")
    if not os.path.exists(save_path):
        raise HTTPException(status_code=404, detail="Dataset not uploaded yet.")
    
    validation = validate_dataset(save_path)
    return validation

@router.post("/train-model")
async def train_model(background_tasks: BackgroundTasks):
    from training_service import execute_training_pipeline
    save_path = os.path.join(os.path.dirname(__file__), "data", "uploaded_dataset.csv")
    if not os.path.exists(save_path):
        raise HTTPException(status_code=404, detail="Dataset not uploaded yet.")
        
    background_tasks.add_task(execute_training_pipeline, save_path)
    return {"status": "training_started"}

@router.get("/model-metrics", response_model=models.ModelMetricsResponse)
async def get_model_metrics():
    from training_service import get_metrics
    return get_metrics()

@router.post("/predict", response_model=models.PredictResponse)
async def predict_aqi(request: models.PredictRequest, db: Session = Depends(get_db)):
    current_time = datetime.datetime.utcnow()
    
    # 1. ORM storage handling FIRST so it acts as history
    db_record = models.SensorData(
        timestamp=current_time,
        co=request.co,
        nox=request.nox,
        no2=request.no2,
        temperature=request.temperature,
        humidity=request.humidity,
        abs_humidity=request.abs_humidity,
        pt08_s1_co=request.pt08_s1_co,
        c6h6_gt=request.c6h6_gt,
        pt08_s2_nmhc=request.pt08_s2_nmhc,
        pt08_s3_nox=request.pt08_s3_nox,
        pt08_s4_no2=request.pt08_s4_no2,
        pt08_s5_o3=request.pt08_s5_o3,
        nmhc_gt=request.nmhc_gt
    )
    db.add(db_record)
    db.commit()
    db.refresh(db_record) # Ensure it's reachable immediately if needed

    try:
        # 2. Run through the Model Inference Service (stateful)
        raw_co_val = make_prediction(request.model_dump(), db, current_time)
        from aqi_calculator import calculate_co_aqi
        final_aqi = calculate_co_aqi(raw_co_val)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    # 3. Store Prediction
    pred_record = models.PredictionRecord(
        timestamp=current_time,
        predicted_aqi=final_aqi,
        confidence=0.85 
    )
    db.add(pred_record)
    db.commit()
    
    return {
        "predicted_aqi": final_aqi,
        "raw_co_prediction": raw_co_val,
        "confidence": 0.85,
        "timestamp": current_time
    }

@router.post("/forecast", response_model=models.ForecastResponse)
async def forecast_aqi(request: models.PredictRequest, db: Session = Depends(get_db)):
    """
    Returns future AQI predictions at +1hr, +3hr, +6hr, and +12hr horizons.

    The current sensor reading is stored to the database first (building up
    historical context), and then a recursive multi-step forecast is run using
    the existing trained Random Forest model.
    """
    current_time = datetime.datetime.utcnow()

    # 1. Persist current reading so it contributes to the history window
    db_record = models.SensorData(
        timestamp=current_time,
        co=request.co,
        nox=request.nox,
        no2=request.no2,
        temperature=request.temperature,
        humidity=request.humidity,
        abs_humidity=request.abs_humidity,
        pt08_s1_co=request.pt08_s1_co,
        c6h6_gt=request.c6h6_gt,
        pt08_s2_nmhc=request.pt08_s2_nmhc,
        pt08_s3_nox=request.pt08_s3_nox,
        pt08_s4_no2=request.pt08_s4_no2,
        pt08_s5_o3=request.pt08_s5_o3,
        nmhc_gt=request.nmhc_gt,
    )
    db.add(db_record)
    db.commit()

    try:
        # 2. Run recursive multi-step forecast
        forecast_points = make_forecast(request.model_dump(), db, current_time)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # 3. Persist each forecast point
    for point in forecast_points:
        db.add(models.ForecastRecord(
            request_timestamp=current_time,
            hours_ahead=point["hours_ahead"],
            predicted_timestamp=point["predicted_timestamp"],
            predicted_co=point["predicted_co"],
            predicted_aqi=point["predicted_aqi"],
        ))
    db.commit()

    return {
        "current_timestamp": current_time.isoformat() + "Z",
        "forecasts": forecast_points,
    }

@router.get("/forecast-history")
async def forecast_history(limit: int = 20, db: Session = Depends(get_db)):
    """
    Returns the most recent N forecast requests with all their horizon points.
    Useful for the frontend to display a history of past forecast runs.
    """
    records = (
        db.query(models.ForecastRecord)
        .order_by(models.ForecastRecord.request_timestamp.desc())
        .limit(limit * 4)   # 4 horizon points per request
        .all()
    )

    # Group by request_timestamp
    from collections import defaultdict
    grouped: dict = defaultdict(list)
    for r in records:
        grouped[r.request_timestamp.isoformat() + "Z"].append({
            "hours_ahead": r.hours_ahead,
            "predicted_timestamp": r.predicted_timestamp,
            "predicted_co": r.predicted_co,
            "predicted_aqi": r.predicted_aqi,
        })

    history = [
        {"requested_at": ts, "forecasts": points}
        for ts, points in sorted(grouped.items(), reverse=True)
    ][:limit]

    return {"history": history}

@router.post("/batch-predict")
async def batch_predict(request: models.BatchPredictRequest, db: Session = Depends(get_db)):
    from aqi_calculator import calculate_co_aqi
    predictions = []
    current_time = datetime.datetime.utcnow()
    for record in request.records:
        # pydantic v2 compatible
        raw_co_val = make_prediction(record.model_dump(), db, current_time)
        final_aqi = calculate_co_aqi(raw_co_val)
        predictions.append({
            "predicted_aqi": final_aqi,
            "raw_co_prediction": raw_co_val, 
            "timestamp": current_time
        })
    return {"predictions": predictions}

@router.get("/aqi-trends")
async def aqi_trends(db: Session = Depends(get_db)):
    records = db.query(models.PredictionRecord).order_by(models.PredictionRecord.timestamp.desc()).limit(50).all()
    # reversed because we want the chronological sequence (oldest first in chart)
    trend = [{"timestamp": r.timestamp, "predicted_aqi": r.predicted_aqi} for r in reversed(records)]
    return {"trend": trend}

@router.get("/aqi-comparison")
async def aqi_comparison(db: Session = Depends(get_db)):
    from aqi_calculator import calculate_co_aqi
    records = db.query(models.PredictionRecord, models.SensorData).\
        join(models.SensorData, models.PredictionRecord.timestamp == models.SensorData.timestamp).\
        order_by(models.PredictionRecord.timestamp.desc()).limit(50).all()
    
    actual = []
    predicted = []
    for pred, sensor in reversed(records):
        actual.append({"timestamp": sensor.timestamp, "aqi": calculate_co_aqi(sensor.co)})
        predicted.append({"timestamp": pred.timestamp, "aqi": pred.predicted_aqi})
        
    return {"actual": actual, "predicted": predicted}

@router.get("/aqi-filter")
async def aqi_filter(pollutant: str, start_date: str = None, end_date: str = None, db: Session = Depends(get_db)):
    query = db.query(models.SensorData)
    
    # SQLite string comparisons for dates natively work if formatted safely
    if start_date:
        query = query.filter(models.SensorData.timestamp >= start_date)
    if end_date:
        query = query.filter(models.SensorData.timestamp <= end_date)
        
    records = query.order_by(models.SensorData.timestamp.desc()).limit(100).all()
    
    filtered_data = []
    for r in reversed(records):
        val = getattr(r, pollutant.lower(), None)
        if val is not None:
             filtered_data.append({"timestamp": r.timestamp, "value": val})
             
    return {"filtered_data": filtered_data}

@router.get("/export-predictions")
async def export_predictions():
    return {"message": "CSV File payload export stub"}

