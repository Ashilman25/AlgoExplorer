import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


@pytest.fixture(autouse = True)
def use_memory_rate_limiter():
    """Swap Redis storage with in-memory storage on the shared slowapi limiter for all tests,
    and raise all per-route limits to 1000/minute so lockout and other multi-request tests
    are not blocked by the rate limiter before the application logic under test can execute.

    The @limiter.limit() decorator captures self (the Limiter) in a closure, so the
    middleware-level app.state.limiter swap is insufficient. The actual rate-check call
    goes through limiter.limiter (a FixedWindowRateLimiter) whose .storage attribute
    points to the Redis backend. We patch both the slowapi Limiter._storage and the
    inner strategy's .storage so all enforcement paths use memory storage.
    """
    import app.rate_limiting as rl_module
    from limits import parse as parse_limit
    from limits.storage import storage_from_string

    # Import routes to ensure _route_limits is populated before we patch
    import app.main  # noqa: F401 — triggers route registration as a side effect

    sl_limiter = rl_module.limiter
    strategy = sl_limiter.limiter  # FixedWindowRateLimiter (or similar)

    original_sl_storage = sl_limiter._storage
    original_strategy_storage = strategy.storage

    mem_storage = storage_from_string("memory://")
    sl_limiter._storage = mem_storage
    strategy.storage = mem_storage

    # Raise every per-route limit to 1000/minute so multi-attempt tests (e.g. account
    # lockout) are never blocked by the rate limiter before the business logic fires.
    high_limit = parse_limit("1000/minute")
    original_limits: dict = {}
    for route_key, limit_list in sl_limiter._route_limits.items():
        original_limits[route_key] = [lobj.limit for lobj in limit_list]
        for lobj in limit_list:
            lobj.limit = high_limit

    yield

    sl_limiter._storage = original_sl_storage
    strategy.storage = original_strategy_storage

    # Restore original per-route limits
    for route_key, orig_limits in original_limits.items():
        for lobj, orig in zip(sl_limiter._route_limits[route_key], orig_limits):
            lobj.limit = orig
