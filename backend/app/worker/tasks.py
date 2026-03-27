import traceback
from datetime import datetime

from app.benchmark.service import run_benchmark
from app.data.models import BenchmarkJob
from app.db import SessionLocal
from app.observability import get_logger, compact_context, summarize_benchmark_config, summarize_summary_metrics
from app.persistence import safe_json_value
from app.config import settings

logger = get_logger("benchmark.worker")


def execute_benchmark(benchmark_id: int) -> None:
    db = SessionLocal()
    job = None

    try:
        job = db.query(BenchmarkJob).filter(BenchmarkJob.id == benchmark_id).first()

        if job is None:
            logger.error(
                "benchmark.worker.job_not_found %s",
                compact_context(benchmark_id = benchmark_id),
            )
            return

        job.status = "running"
        db.commit()

        logger.info(
            "benchmark.worker.job_started %s",
            compact_context(
                benchmark_id = benchmark_id,
                module_type = job.module_type,
                **summarize_benchmark_config(job.config),
            ),
        )

        progress_interval = settings.benchmark_progress_interval
        combo_count = 0

        def progress_callback(completed_runs: int, total_runs: int) -> None:
            nonlocal combo_count
            combo_count += 1

            if combo_count % progress_interval == 0 or completed_runs == total_runs:
                job.progress = round(completed_runs / total_runs, 4) if total_runs > 0 else 0.0
                db.commit()

                logger.info(
                    "benchmark.worker.progress %s",
                    compact_context(
                        benchmark_id = benchmark_id,
                        progress = job.progress,
                        completed_runs = completed_runs,
                        total_runs = total_runs,
                    ),
                )

        result = run_benchmark(
            job.module_type,
            job.config,
            benchmark_id = benchmark_id,
            progress_callback = progress_callback,
        )

        job.results = safe_json_value(
            {"series": result["series"], "table": result["table"]},
            label = "benchmark results",
        )
        job.summary = safe_json_value(result["summary"], label = "benchmark summary")
        job.status = "completed"
        job.progress = 1.0
        job.completed_at = datetime.utcnow()
        db.commit()

        logger.info(
            "benchmark.worker.job_completed %s",
            compact_context(
                benchmark_id = benchmark_id,
                module_type = job.module_type,
                summary = summarize_summary_metrics(job.summary),
            ),
        )

    except Exception as exc:
        if job is not None:
            try:
                job.status = "failed"
                job.completed_at = datetime.utcnow()
                job.summary = safe_json_value({
                    "error": str(exc),
                    "traceback": traceback.format_exc()[-500:],
                }, label = "benchmark error summary")
                db.commit()
            except Exception:
                logger.exception(
                    "benchmark.worker.status_update_failed %s",
                    compact_context(benchmark_id = benchmark_id),
                )

        logger.exception(
            "benchmark.worker.job_failed %s",
            compact_context(
                benchmark_id = benchmark_id,
                error = str(exc),
            ),
        )

    finally:
        db.close()
