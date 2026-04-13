from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models
from database import engine
from routes import router

# Instantiates local SQLite Data Structures cleanly
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AQI Prediction API",
    description="Backend Service handling time-series RF predictions for City Monitoring.",
    version="1.0.0"
)

# CORS middleware for the future React UI Dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Open for MVP scoping
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect Endpoint Route Definitions
app.include_router(router)

@app.get("/")
def read_root():
    return {"message": "AQI Backend Service is securely running."}

@app.get("/health")
def health_check():
    from ml_service import aqi_model
    return {
        "status": "healthy",
        "model_loaded": aqi_model is not None
    }

if __name__ == "__main__":
    import uvicorn
    # This block allows you to start the server simply by running `python main.py`
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
