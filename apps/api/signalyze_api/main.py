"""FastAPI application factory.

Wires CORS (extension origins only), the 2 MB body guard, the anonymised access log, slowapi
rate limiting, uniform ``{"error", "message"}`` error bodies and the profile cache lifecycle
(PostgreSQL when DATABASE_URL is set, otherwise in-memory).
"""

from __future__ import annotations

import logging
import sys
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.exceptions import HTTPException as StarletteHTTPException

from signalyze_api import __version__
from signalyze_api.cache import MemoryCache, PostgresCache
from signalyze_api.config import Settings, get_settings
from signalyze_api.engine import ENGINE_VERSION
from signalyze_api.logging_middleware import AccessLogMiddleware
from signalyze_api.routes import register_routes

log = logging.getLogger("signalyze.api")

_HTTP_ERROR_SLUGS: dict[int, str] = {
    404: "not_found",
    405: "method_not_allowed",
    413: "payload_too_large",
    429: "rate_limited",
}


def configure_logging() -> None:
    """Plain lines to stdout; a no-op when the root logger is already configured."""
    logging.basicConfig(
        level=logging.INFO,
        stream=sys.stdout,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    # httpx logs every outbound request URL at INFO; the access log is the only per-request line.
    logging.getLogger("httpx").setLevel(logging.WARNING)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = app.state.settings
    if not isinstance(settings, Settings):
        settings = get_settings()
        app.state.settings = settings
    postgres: PostgresCache | None = None
    if settings.database_url:
        try:
            postgres = await PostgresCache.connect(settings.database_url)
        except Exception as exc:
            log.error(
                "PostgreSQL unavailable (%s); serving with the in-memory cache",
                type(exc).__name__,
            )
        else:
            app.state.cache = postgres
    log.info(
        "signalyze-api %s engine %s cache=%s", __version__, ENGINE_VERSION, app.state.cache.kind
    )
    try:
        yield
    finally:
        if postgres is not None:
            await postgres.close()


async def _rate_limited(request: Request, exc: Exception) -> Response:
    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limited",
            "message": "Too many analyses from this address; please try again later.",
        },
    )


async def _invalid_request(request: Request, exc: Exception) -> Response:
    details: list[dict[str, object]] = []
    if isinstance(exc, RequestValidationError):
        for error in exc.errors():
            loc = [str(part) for part in error.get("loc", ())]
            details.append({"loc": loc, "msg": str(error.get("msg", ""))})
    return JSONResponse(
        status_code=422,
        content={
            "error": "invalid_request",
            "message": "Request validation failed.",
            "details": details,
        },
    )


async def _http_error(request: Request, exc: Exception) -> Response:
    if isinstance(exc, StarletteHTTPException):
        status, detail, headers = exc.status_code, str(exc.detail), exc.headers
    else:
        status, detail, headers = 500, "Internal error.", None
    return JSONResponse(
        status_code=status,
        content={"error": _HTTP_ERROR_SLUGS.get(status, f"http_{status}"), "message": detail},
        headers=headers,
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    configure_logging()
    settings = settings or get_settings()
    app = FastAPI(
        title="Signalyze API",
        version=__version__,
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.cache = MemoryCache()

    limiter = Limiter(key_func=get_remote_address, headers_enabled=False)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limited)
    app.add_exception_handler(RequestValidationError, _invalid_request)
    app.add_exception_handler(StarletteHTTPException, _http_error)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
        max_age=600,
    )

    @app.middleware("http")
    async def limit_body_size(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        length = request.headers.get("content-length")
        if length is not None and length.isdigit() and int(length) > settings.max_body_bytes:
            return JSONResponse(
                status_code=413,
                content={"error": "payload_too_large", "message": "Request body exceeds 2 MB."},
            )
        return await call_next(request)

    # Added last so it is the outermost layer and sees every response, including 413s.
    app.add_middleware(AccessLogMiddleware)

    register_routes(app, settings, limiter)
    return app


app = create_app()
