from fastapi import APIRouter, Depends
from app.exceptions import NotFoundException, DomainError
from app.schemas.benchmarks import CreateBenchmarkRequest, CreateBenchmarkResponse, BenchmarkResultsResponse, BenchmarkStatusResponse
from app.db import get_db
from app.data.models import BenchmarkJob

router = APIRouter(prefix = "/api/benchmarks")

#querys all benchmark job rows, returns list of BenchmarkStatusResponse, just status/progress per job
@router.get("/", response_model = list[BenchmarkStatusResponse])
def get_status_info(db = Depends(get_db)):
    rows = db.query(BenchmarkJob).all()
    status_responses = []
    
    for job in rows:
        status_responses.append(BenchmarkStatusResponse.model_validate(job))
        
    return status_responses



@router.post("/", response_model = BenchmarkStatusResponse)
def create_benchmark_job(body: CreateBenchmarkRequest, db = Depends(get_db)):
    job = BenchmarkJob(
        module_type = body.module_type,
        config = body.config,
        status = "pending",
        progress = 0.0,
        summary = {},
        results = {}
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    return BenchmarkStatusResponse.model_validate(job)
    
    
    
    
    
    
    