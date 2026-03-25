from fastapi import APIRouter, Depends, Query
from app.exceptions import NotFoundException
from app.observability import get_logger, compact_context, summarize_input_payload, summarize_algorithm_config
from app.schemas.runs import CreateRunRequest, CreateRunResponse, RunSummary
from app.schemas.timeline import TimelineResponse
from app.db import get_db
from app.data.models import SimulationRun
from app.simulation.orchestrator import run_simulation

router = APIRouter(prefix = "/api/runs")
logger = get_logger("routes.runs")


# Returns id, module_type, algorithm_key, summary metrics, created_at
@router.get("/{run_id}", response_model = RunSummary)
def get_run_summary(run_id: int, db = Depends(get_db)):
    run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
    if not run:
        raise NotFoundException(f"Run '{run_id}' not found.")
    
    return RunSummary.model_validate(run)


# Execute an algorithm, persist the run, return a summary response
@router.post("/", response_model = CreateRunResponse)
def create_run(body: CreateRunRequest, db = Depends(get_db)):
    logger.info(
        "run.create.request %s",
        compact_context(
            module_type = body.module_type,
            algorithm_key = body.algorithm_key,
            execution_mode = body.execution_mode,
            explanation_level = body.explanation_level,
            scenario_id = body.scenario_id,
            input = summarize_input_payload(body.module_type, body.algorithm_key, body.input_payload),
            **summarize_algorithm_config(body.algorithm_config),
        ),
    )
    return run_simulation(body, db)



#gets a bunch of timeline steps by run_id, puts it into a timeline response
@router.get("/{run_id}/timeline", response_model = TimelineResponse)
def get_timeline(run_id: int, offset: int = Query(default = 0, ge = 0), limit: int | None = Query(default = None, ge = 1), db = Depends(get_db)):
    run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
    if not run:
        raise NotFoundException(f"Run '{run_id}' not found.")

    total = len(run.timeline)
    
    if limit is not None:
        window = run.timeline[offset : offset + limit]
    else:
        window = run.timeline[offset:]
        
    timeline = TimelineResponse(
        run_id = run_id,
        total_steps = total,
        module_type = run.module_type,
        algorithm_key = run.algorithm_key,
        steps = window,
        offset = offset,
        limit = limit
    )
    
    return timeline
