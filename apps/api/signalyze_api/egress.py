"""The API's only outbound HTTP client, with a host allowlist enforced before every request.

The client accepts requests to the host of the configured endpoint (``LLM_BASE_URL``) and
refuses everything else, so no code path in this service can reach any other host. The
static test ``tests/test_no_google_egress.py`` complements this at the source level.
"""

from __future__ import annotations

import httpx


class BlockedEgressError(RuntimeError):
    """Raised before any bytes leave the process when a request targets a non-allowlisted host."""


def allowed_host_of(base_url: str) -> str:
    host = httpx.URL(base_url).host.lower()
    if not host:
        raise ValueError("the outbound base URL must include a host")
    return host


def build_client(
    base_url: str,
    api_key: str,
    *,
    timeout: float = 8.0,
    transport: httpx.AsyncBaseTransport | None = None,
) -> httpx.AsyncClient:
    """Build an ``httpx.AsyncClient`` that can only talk to the host of ``base_url``."""
    allowed = allowed_host_of(base_url)

    async def guard(request: httpx.Request) -> None:
        host = request.url.host.lower()
        if host != allowed:
            raise BlockedEgressError(
                f"outbound request to {host!r} refused; only {allowed!r} is allowed"
            )

    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
    return httpx.AsyncClient(
        base_url=base_url,
        headers=headers,
        timeout=timeout,
        follow_redirects=False,
        event_hooks={"request": [guard]},
        transport=transport,
    )
