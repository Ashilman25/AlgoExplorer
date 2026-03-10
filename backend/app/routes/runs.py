from fastapi import APIRouter, Depends
from app.data.registry import REGISTRY
from app.exceptions import NotFoundException, DomainError
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


#runs algorithm, saves result to simulation run, returns run response
@router.post("/", response_model = CreateRunResponse)
def run_algorithm(body: CreateRunRequest, db = Depends(get_db)):
    raise DomainError("Run execution not yet implemented")



#gets a bunch of timeline steps by run_id, puts it into a timeline response
@router.get("/{run_id}/timeline", response_model = TimelineResponse)
def get_timeline(run_id: int, db = Depends(get_db)):
    
    run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
    if not run:
        raise NotFoundException(f"Simulation Run '{run_id}' not found.")
    
    timeline_response = TimelineResponse(
        run_id = run_id,
        total_steps = len(run.timeline),
        module_type = run.module_type,
        algorithm_key = run.algorithm_key,
        steps = run.timeline
    )
    
    return timeline_response
    
    