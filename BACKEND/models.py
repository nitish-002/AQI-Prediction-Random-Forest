from sqlalchemy import Column, Integer, Float, String, DateTime
from database import Base
from pydantic import BaseModel
from typing import List, Optional
import datetime

# --- SQLAlchemy ORM Models (Database layer) ---
class SensorData(Base):
    __tablename__ = "sensor_data"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    co = Column(Float)
    nox = Column(Float)
    no2 = Column(Float)
    temperature = Column(Float)
    humidity = Column(Float)

class PredictionRecord(Base):
    __tablename__ = "predictions"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    predicted_aqi = Column(Float)
    confidence = Column(Float)

# --- Pydantic Schemas (API Translation layer APIContracts.md) ---
class PredictRequest(BaseModel):
    co: float
    nox: float
    no2: float
    temperature: float
    humidity: float
    timestamp: datetime.datetime

class PredictResponse(BaseModel):
    predicted_aqi: float
    confidence: float
    timestamp: datetime.datetime

class BatchPredictRequest(BaseModel):
    records: List[PredictRequest]

class ValidateDataResponse(BaseModel):
    missing_values: bool
    timestamp_valid: bool
    schema_valid: bool

class ModelMetricsResponse(BaseModel):
    rmse: float
    mae: float
    r2_score: float
