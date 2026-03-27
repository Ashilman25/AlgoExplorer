from redis import Redis
from app.config import settings

_connection: Redis | None = None


def get_redis() -> Redis:
    global _connection
    if _connection is None:
        _connection = Redis.from_url(settings.redis_url)
    return _connection
