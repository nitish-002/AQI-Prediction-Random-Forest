from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
import models
from ml_service import make_prediction

router = APIRouter()

@router.post("/upload-csv")
async def upload_dataset(file: UploadFile = File(...)):
    # Save the file / Route to Processing Service via Celery etc
    return {"status": "success", "message": "Dataset uploaded successfully"}

@router.post("/validate-data", response_model=models.ValidateDataResponse)
async def validate_data():
    return {"missing_values": False, "timestamp_valid": True, "schema_valid": True}

@router.post("/train-model")
async def train_model():
    return {"status": "training_started"}

@router.get("/model-metrics", response_model=models.ModelMetricsResponse)
async def get_model_metrics():
    return {"rmse": 12.4, "mae": 8.7, "r2_score": 0.81}

@router.post("/predict", response_model=models.PredictResponse)
async def predict_aqi(request: models.PredictRequest, db: Session = Depends(get_db)):
    feature_dict = {
        "co": request.co,
        "nox": request.nox,
        "no2": request.no2,
        "temperature": request.temperature,
        "humidity": request.humidity
    }
    
    # Run through the Model Inference Service
    predicted_val = make_prediction(feature_dict)
    
    # ORM storage
    db_record = models.PredictionRecord(
        timestamp=request.timestamp,
        predicted_aqi=predicted_val,
        confidence=0.85
    )
    db.add(db_record)
    db.commit()
    
    return {
        "predicted_aqi": predicted_val,
        "confidence": 0.85,
        "timestamp": request.timestamp
    }

@router.post("/batch-predict")
async def batch_predict(request: models.BatchPredictRequest):
    predictions = []
    for record in request.records:
        # pydantic v2 compatible
        val = make_prediction(record.model_dump(exclude={'timestamp'}))
        predictions.append({"predicted_aqi": val, "timestamp": record.timestamp})
    return {"predictions": predictions}

@router.get("/aqi-trends")
async def aqi_trends():
    return {"trend": [{"timestamp": "2026-02-24T10:00:00", "predicted_aqi": 145}]}

@router.get("/aqi-comparison")
async def aqi_comparison():
    return {"actual": [], "predicted": []}

@router.get("/aqi-filter")
async def aqi_filter(start_date: str, end_date: str, pollutant: str):
    return {"filtered_data": []}

@router.get("/export-predictions")
async def export_predictions():
    return {"message": "CSV File payload export stub"}
