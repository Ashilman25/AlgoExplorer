from datetime import datetime

from fastapi import APIRouter, Depends
from app.exceptions import NotFoundException, PermissionError
from app.observability import get_logger, compact_context, summarize_benchmark_config, summarize_summary_metrics
from app.schemas.benchmarks import CreateBenchmarkRequest, BenchmarkResultsResponse, BenchmarkStatusResponse, UpdateBenchmarkStatusRequest
from app.db import get_db
from app.data.models import BenchmarkJob, UserAccount
from app.benchmark.service import run_benchmark
from app.services.auth_service import get_optional_user

router = APIRouter(prefix = "/api/benchmarks")
logger = get_logger("routes.benchmarks")


def _check_benchmark_access(job: BenchmarkJob, user: UserAccount | None) -> None:
    if job.user_id is not None:
        if user is None or user.id != job.user_id:
            raise PermissionError("You do not have access to this benchmark.")


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
    config = {
        "algorithm_keys": body.algorithm_keys,
        "input_family": body.input_family,
        "sizes": body.sizes,
        "trials_per_size": body.trials_per_size,
        "metrics": body.metrics,
    }

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
        status = "running",
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

    try:
        result = run_benchmark(body.module_type, config, benchmark_id = job.id)

        job.results = {"series": result["series"], "table": result["table"]}
        job.summary = result["summary"]
        job.status = "completed"
        job.progress = 1.0
        job.completed_at = datetime.utcnow()

        logger.info(
            "benchmark.job.completed %s",
            compact_context(
                benchmark_id = job.id,
                module_type = job.module_type,
                status = job.status,
                summary = summarize_summary_metrics(job.summary),
            ),
        )

    except Exception:
        job.status = "failed"
        job.progress = 0.0
        job.completed_at = datetime.utcnow()
        logger.exception(
            "benchmark.job.failed %s",
            compact_context(
                benchmark_id = job.id,
                module_type = job.module_type,
                status = job.status,
                **summarize_benchmark_config(job.config),
            ),
        )
        raise

    finally:
        db.commit()
        db.refresh(job)

    return BenchmarkStatusResponse.model_validate(job)


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
