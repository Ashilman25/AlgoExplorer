from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.config import settings
from app.exceptions import DomainError, NotFoundException, PermissionError
from app.schemas.errors import ErrorDetail, ErrorResponse
from app.routes import metadata, runs, benchmarks


# to start:
# python -m uvicorn app.main:app --reload

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins = settings.cors_origins_list,
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"],
)

app.include_router(metadata.router)
app.include_router(runs.router)
app.include_router(benchmarks.router)

# EXCEPTION HANDLING

@app.exception_handler(RequestValidationError)
async def validation_error_handler(_request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code = 422,
        content = ErrorResponse(
            error =ErrorDetail(
                error_code = "VALIDATION_ERROR",
                message = "Invalid request data.",
                details = {"errors": exc.errors()},
            )
        ).model_dump(),
    )


@app.exception_handler(DomainError)
async def domain_error_handler(_request: Request, exc: DomainError):
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


@app.exception_handler(NotFoundException)
async def not_found_handler(_request: Request, exc: NotFoundException):
    return JSONResponse(
        status_code = 404,
        content = ErrorResponse(
            error = ErrorDetail(
                error_code = "NOT_FOUND",
                message = exc.message,
            )
        ).model_dump(),
    )


@app.exception_handler(PermissionError)
async def permission_error_handler(_request: Request, exc: PermissionError):
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
async def unexpected_error_handler(_request: Request, _exc: Exception):
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