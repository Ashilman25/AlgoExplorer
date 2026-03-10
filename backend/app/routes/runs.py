from fastapi import APIRouter, Depends
from app.data.registry import REGISTRY
from app.exceptions import NotFoundException
from app.schemas.runs import CreateRunRequest, CreateRunResponse, RunSummary
from app.schemas.timeline import TimelineResponse
from app.db import get_db
from app.data.models import SimulationRun 

router = APIRouter(prefix = "/api/runs")

#gets summary info of specific run id
@router.get("/{run_id}", response_model = RunSummary)
def get_run_info(run_id: int, db = Depends(get_db)):
    
    run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
    if not run:
        raise NotFoundException(f"Simulation Run '{run_id}' not found.")
    
    return RunSummary.model_validate(run)

