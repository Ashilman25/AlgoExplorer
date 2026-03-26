from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.config import settings
from app.exceptions import AuthenticationError, ConflictError, DomainError, NotFoundException, PermissionError
from app.observability import configure_logging, get_logger, compact_context, request_context
from app.schemas.errors import ErrorDetail, ErrorResponse
from app.routes import auth, metadata, runs, benchmarks
from app.db import init_db


# to start:
# python -m uvicorn app.main:app --reload

configure_logging(settings.log_level)
logger = get_logger("main")

@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    
    context = compact_context(
        env = settings.env,
        cors_origin_count = len(settings.cors_origins_list),
        log_level = settings.log_level.upper()
    )
    
    logger.info("app.startup.complete %s", context)
    yield


app = FastAPI(lifespan = lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins = settings.cors_origins_list,
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"],
)

app.include_router(metadata.router)
app.include_router(auth.router)
app.include_router(runs.router)
app.include_router(benchmarks.router)

# EXCEPTION HANDLING

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    safe_errors = [
        {"loc": e.get("loc", []), "msg": e.get("msg", ""), "type": e.get("type", "")}
        for e in exc.errors()
    ]
    
    logger.warning(
        "request.validation_failed %s",
        compact_context(
            **request_context(request),
            error_count = len(safe_errors),
            errors = safe_errors[:5],
        ),
    )
    
    return JSONResponse(
        status_code = 422,
        content = ErrorResponse(
            error = ErrorDetail(
                error_code = "VALIDATION_ERROR",
                message = "Invalid request data.",
                details = {"errors": safe_errors},
            )
        ).model_dump(),
    )


@app.exception_handler(DomainError)
async def domain_error_handler(request: Request, exc: DomainError):
    logger.warning(
        "request.domain_error %s",
        compact_context(
            **request_context(request),
            message = exc.message,
            details = exc.details,
        ),
    )
    return JSONResponse(
        status_code = 400,
        content = ErrorResponse(
            error = ErrorDetail(
                error_code = "INVALID_INPUT",
                message = exc.message,
                details = exc.details,
            )
        ).model_dump(),
    )


@app.exception_handler(AuthenticationError)
async def authentication_error_handler(request: Request, exc: AuthenticationError):
    logger.warning(
        "request.unauthorized %s",
        compact_context(
            **request_context(request),
            message = exc.message,
            details = exc.details,
        ),
    )
    return JSONResponse(
        status_code = 401,
        content = ErrorResponse(
            error = ErrorDetail(
                error_code = "UNAUTHORIZED",
                message = exc.message,
                details = exc.details,
            )
        ).model_dump(),
    )


@app.exception_handler(NotFoundException)
async def not_found_handler(request: Request, exc: NotFoundException):
    logger.warning(
        "request.not_found %s",
        compact_context(
            **request_context(request),
            message = exc.message,
        ),
    )
    return JSONResponse(
        status_code = 404,
        content = ErrorResponse(
            error = ErrorDetail(
                error_code = "NOT_FOUND",
                message = exc.message,
            )
        ).model_dump(),
    )


@app.exception_handler(ConflictError)
async def conflict_error_handler(request: Request, exc: ConflictError):
    logger.warning(
        "request.conflict %s",
        compact_context(
            **request_context(request),
            message = exc.message,
            details = exc.details,
        ),
    )
    return JSONResponse(
        status_code = 409,
        content = ErrorResponse(
            error = ErrorDetail(
                error_code = "CONFLICT",
                message = exc.message,
                details = exc.details,
            )
        ).model_dump(),
    )


@app.exception_handler(PermissionError)
async def permission_error_handler(request: Request, exc: PermissionError):
    logger.warning(
        "request.forbidden %s",
        compact_context(
            **request_context(request),
            message = exc.message,
        ),
    )
    return JSONResponse(
        status_code = 403,
        content = ErrorResponse(
            error = ErrorDetail(
                error_code = "FORBIDDEN",
                message = exc.message,
            )
        ).model_dump(),
    )


@app.exception_handler(Exception)
async def unexpected_error_handler(request: Request, exc: Exception):
    logger.error(
        "request.unhandled_error %s",
        request_context(request),
        exc_info = (type(exc), exc, exc.__traceback__),
    )
    return JSONResponse(
        status_code = 500,
        content = ErrorResponse(
            error = ErrorDetail(
                error_code = "INTERNAL_ERROR",
                message = "An unexpected error occurred.",
            )
        ).model_dump(),
    )


# base routes

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/version")
def version():
    return {"version": "0.1.0"}
