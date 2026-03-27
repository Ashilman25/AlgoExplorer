from fastapi import APIRouter, Depends
from rq import Queue
from app.exceptions import NotFoundException, PermissionError
from app.observability import get_logger, compact_context, summarize_benchmark_config
from app.persistence import safe_json_value
from app.worker.connection import get_redis
from app.worker.health import get_worker_health
from app.worker.tasks import execute_benchmark
from app.config import settings
from app.schemas.benchmarks import (
    CreateBenchmarkRequest,
    BenchmarkResultsResponse,
    BenchmarkStatusResponse,
    UpdateBenchmarkStatusRequest,
    WorkerHealthResponse,
)
from app.db import get_db
from app.data.models import BenchmarkJob, UserAccount
from app.services.auth_service import get_optional_user

router = APIRouter(prefix = "/api/benchmarks")
logger = get_logger("routes.benchmarks")


def _check_benchmark_access(job: BenchmarkJob, user: UserAccount | None) -> None:
    if job.user_id is not None:
        if user is None or user.id != job.user_id:
            raise PermissionError("You do not have access to this benchmark.")


def enqueue_benchmark(benchmark_id: int) -> None:
    connection = get_redis()
    queue = Queue(settings.benchmark_queue_name, connection = connection)
    queue.enqueue(execute_benchmark, benchmark_id, job_timeout = "30m")

    logger.info(
        "benchmark.job.enqueued %s",
        compact_context(
            benchmark_id = benchmark_id,
            queue = settings.benchmark_queue_name,
        ),
    )


@router.get("/", response_model = list[BenchmarkStatusResponse])
def list_benchmark_jobs(db = Depends(get_db), user: UserAccount | None = Depends(get_optional_user)):
    if user:
        rows = db.query(BenchmarkJob).filter(BenchmarkJob.user_id == user.id).order_by(BenchmarkJob.created_at.desc()).all()
    else:
        rows = db.query(BenchmarkJob).filter(BenchmarkJob.user_id.is_(None)).order_by(BenchmarkJob.created_at.desc()).all()
        
    jobs = [BenchmarkStatusResponse.model_validate(job) for job in rows]

    return jobs


@router.post("/", response_model = BenchmarkStatusResponse)
def create_benchmark_job(body: CreateBenchmarkRequest, db = Depends(get_db), user: UserAccount | None = Depends(get_optional_user)):
    config = safe_json_value({
        "algorithm_keys": body.algorithm_keys,
        "input_family": body.input_family,
        "sizes": body.sizes,
        "trials_per_size": body.trials_per_size,
        "metrics": body.metrics,
    }, label = "benchmark config")

    logger.info(
        "benchmark.create.request %s",
        compact_context(
            module_type = body.module_type,
            **summarize_benchmark_config(config),
        ),
    )

    job = BenchmarkJob(
        user_id = user.id if user else None,
        module_type = body.module_type,
        config = config,
        status = "pending",
        progress = 0.0,
        summary = {},
        results = {},
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    logger.info(
        "benchmark.job.created %s",
        compact_context(
            benchmark_id = job.id,
            module_type = job.module_type,
            status = job.status,
            **summarize_benchmark_config(job.config),
        ),
    )

    enqueue_benchmark(job.id)

    return BenchmarkStatusResponse.model_validate(job)


@router.get("/workers/health", response_model = WorkerHealthResponse)
def worker_health():
    return get_worker_health()


@router.get("/{benchmark_id}", response_model = BenchmarkStatusResponse)
def get_benchmark_job(benchmark_id: int, db = Depends(get_db), user: UserAccount | None = Depends(get_optional_user)):
    job = db.query(BenchmarkJob).filter(BenchmarkJob.id == benchmark_id).first()
    if not job:
        raise NotFoundException(f"Benchmark Job '{benchmark_id}' not found.")

    _check_benchmark_access(job, user)
    return BenchmarkStatusResponse.model_validate(job)


@router.patch("/{benchmark_id}/status", response_model = BenchmarkStatusResponse)
def update_benchmark_status(benchmark_id: int, body: UpdateBenchmarkStatusRequest, db = Depends(get_db), user: UserAccount | None = Depends(get_optional_user)):
    job = db.query(BenchmarkJob).filter(BenchmarkJob.id == benchmark_id).first()
    if not job:
        raise NotFoundException(f"Benchmark Job '{benchmark_id}' not found.")

    _check_benchmark_access(job, user)
    job.status = body.status
    job.progress = body.progress
    db.commit()
    db.refresh(job)

    return BenchmarkStatusResponse.model_validate(job)


@router.get("/{benchmark_id}/results", response_model = BenchmarkResultsResponse)
def get_benchmark_results(benchmark_id: int, db = Depends(get_db), user: UserAccount | None = Depends(get_optional_user)):
    job = db.query(BenchmarkJob).filter(BenchmarkJob.id == benchmark_id).first()
    if not job:
        raise NotFoundException(f"Benchmark Job '{benchmark_id}' not found.")

    _check_benchmark_access(job, user)
    results = job.results or {}

    benchmark_result = BenchmarkResultsResponse(
        id = job.id,
        status = job.status,
        summary = job.summary or {},
        series = results.get("series", {}),
        table = results.get("table", []),
        completed_at = job.completed_at
    )

    return benchmark_result
