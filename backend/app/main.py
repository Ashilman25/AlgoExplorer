from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings


#to start
#python -m uvicorn app.main:app --reload

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins = settings.cors_origins_list,
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"],
)

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/version")
def version():
    return {"version": "0.1.0"}