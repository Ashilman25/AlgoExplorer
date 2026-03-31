from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings
from app.observability import get_logger

logger = get_logger("rate_limiting")


def _create_limiter() -> Limiter:
    try:
        limiter = Limiter(
            key_func = get_remote_address,
            storage_uri = settings.rate_limit_storage_uri,
        )
        logger.info("rate_limit.init.succeeded storage_uri=%s", settings.rate_limit_storage_uri)
        return limiter
    except Exception as exc:
        logger.warning(
            "rate_limit.init.fallback reason=%s", str(exc),
        )
        return Limiter(key_func = get_remote_address)


limiter = _create_limiter()
