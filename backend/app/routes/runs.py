from fastapi import APIRouter, Depends, Query
from app.exceptions import NotFoundException, PermissionError
from app.observability import get_logger, compact_context, summarize_input_payload, summarize_algorithm_config
from app.persistence import decode_timeline_payload
from app.schemas.runs import CreateRunRequest, CreateRunResponse, RunSummary
from app.schemas.timeline import TimelineResponse
from app.db import get_db
from app.data.models import SimulationRun, UserAccount
from app.simulation.orchestrator import run_simulation
from app.services.auth_service import get_optional_user

router = APIRouter(prefix = "/api/runs")
logger = get_logger("routes.runs")


def _check_run_access(run: SimulationRun, user: UserAccount | None) -> None:
    if run.user_id is not None:
        if user is None or user.id != run.user_id:
            raise PermissionError("You do not have access to this run.")


@router.get("/", response_model = list[RunSummary])
def list_runs(db = Depends(get_db), user: UserAccount | None = Depends(get_optional_user)):
    if user:
        rows = db.query(SimulationRun).filter(SimulationRun.user_id == user.id).order_by(SimulationRun.created_at.desc()).all()
    else:
        rows = db.query(SimulationRun).filter(SimulationRun.user_id.is_(None)).order_by(SimulationRun.created_at.desc()).all()
        
    return [RunSummary.model_validate(run) for run in rows]


# Returns id, module_type, algorithm_key, summary metrics, created_at
@router.get("/{run_id}", response_model = RunSummary)
def get_run_summary(run_id: int, db = Depends(get_db), user: UserAccount | None = Depends(get_optional_user)):
    run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
    if not run:
        raise NotFoundException(f"Run '{run_id}' not found.")

    _check_run_access(run, user)
    return RunSummary.model_validate(run)


# Execute an algorithm, persist the run, return a summary response
@router.post("/", response_model = CreateRunResponse)
def create_run(body: CreateRunRequest, db = Depends(get_db), user: UserAccount | None = Depends(get_optional_user)):
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
    return run_simulation(body, db, user_id = user.id if user else None)



#gets a bunch of timeline steps by run_id, puts it into a timeline response
@router.get("/{run_id}/timeline", response_model = TimelineResponse)
def get_timeline(run_id: int, offset: int = Query(default = 0, ge = 0), limit: int | None = Query(default = None, ge = 1), db = Depends(get_db), user: UserAccount | None = Depends(get_optional_user)):
    run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
    if not run:
        raise NotFoundException(f"Run '{run_id}' not found.")

    _check_run_access(run, user)

    timeline_steps = decode_timeline_payload(run.timeline)
    total = len(timeline_steps)

    if limit is not None:
        window = timeline_steps[offset : offset + limit]
    else:
        window = timeline_steps[offset:]

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
