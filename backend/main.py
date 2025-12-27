from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
from .models.diagnosis import DiagnosisEngine

app = FastAPI(
    title="RiverEcoHealth DSS API",
    description="Backend for River Shoreline Eco-Health Diagnosis & Decision Support System",
    version="0.1.0"
)

# Configure CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = DiagnosisEngine()

class DiagnosisRequest(BaseModel):
    indicators: dict

@app.get("/")
def read_root():
    return {"message": "Welcome to RiverEcoHealth DSS API"}

@app.get("/api/shorelines")
def get_shorelines():
    file_path = "c:/Users/WQF/.gemini/antigravity/RiverEcoHealth_DSS/data/shorelines_mock.json"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Shoreline data not found")
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

@app.post("/api/diagnose")
def post_diagnose(request: DiagnosisRequest):
    try:
        result = engine.diagnose(request.indicators)
        recs = engine.get_recommendations(result)
        return {
            "diagnosis": result,
            "recommendations": recs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
