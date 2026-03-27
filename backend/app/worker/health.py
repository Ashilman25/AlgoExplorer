from rq import Queue
from rq.worker import Worker

from app.worker.connection import get_redis
from app.config import settings
from app.observability import get_logger, compact_context

logger = get_logger("benchmark.worker")


def get_failed_queue(connection):
    return Queue("failed", connection = connection)


def get_worker_health() -> dict:
    try:
        connection = get_redis()
        workers = Worker.all(connection = connection)
        queue = Queue(settings.benchmark_queue_name, connection = connection)
        failed = get_failed_queue(connection)

        active_count = sum(1 for w in workers if str(w.state) == "busy")
        idle_count = len(workers) - active_count

        result = {
            "workers": {
                "active": active_count,
                "idle": idle_count,
            },
            "queue": {
                "pending": queue.count,
                "failed": failed.count,
            },
            "healthy": len(workers) > 0,
        }

        logger.info(
            "benchmark.worker.health_check %s",
            compact_context(**result["workers"], **result["queue"]),
        )

        return result

    except Exception as exc:
        logger.warning(
            "benchmark.worker.health_check_failed %s",
            compact_context(error = str(exc)),
        )
        return {
            "workers": {"active": 0, "idle": 0},
            "queue": {"pending": 0, "failed": 0},
            "healthy": False,
        }
