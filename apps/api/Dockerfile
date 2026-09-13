# Production image for the Signalyze API. Build context: apps/api
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv

COPY --from=ghcr.io/astral-sh/uv:0.12 /uv /usr/local/bin/uv

WORKDIR /app
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --frozen --no-dev --no-install-project

COPY signalyze_api ./signalyze_api
RUN uv sync --frozen --no-dev

RUN useradd --system --uid 10001 --no-create-home signalyze
USER signalyze

ENV PATH="/opt/venv/bin:$PATH"
EXPOSE 8090
CMD ["uvicorn", "signalyze_api.main:app", "--host", "0.0.0.0", "--port", "8090", "--workers", "2", "--proxy-headers", "--forwarded-allow-ips", "*", "--no-access-log"]
