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
    abs_humidity = Column(Float, nullable=True)
    
    pt08_s1_co = Column(Float, nullable=True)
    c6h6_gt = Column(Float, nullable=True)
    pt08_s2_nmhc = Column(Float, nullable=True)
    pt08_s3_nox = Column(Float, nullable=True)
    pt08_s4_no2 = Column(Float, nullable=True)
    pt08_s5_o3 = Column(Float, nullable=True)
    nmhc_gt = Column(Float, nullable=True)

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
    abs_humidity: Optional[float] = 0.0
    
    pt08_s1_co: Optional[float] = None
    c6h6_gt: Optional[float] = None
    pt08_s2_nmhc: Optional[float] = None
    pt08_s3_nox: Optional[float] = None
    pt08_s4_no2: Optional[float] = None
    pt08_s5_o3: Optional[float] = None
    nmhc_gt: Optional[float] = None

class PredictResponse(BaseModel):
    predicted_aqi: float
    raw_co_prediction: float
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
