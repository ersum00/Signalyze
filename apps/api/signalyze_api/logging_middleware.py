"""One access-log line per request, with the client address anonymised before it is logged.

Format (logger ``signalyze.access``, level INFO): ``{ip} {method} {path} {status} {duration_ms}``.
IPv4 addresses lose their last octet, IPv6 addresses keep only the first three hextets, and
the query string is never logged.
"""

from __future__ import annotations

import ipaddress
import logging
import time

from starlette.types import ASGIApp, Message, Receive, Scope, Send

access_log = logging.getLogger("signalyze.access")


def anonymize_ip(address: str) -> str:
    """IPv4: last octet zeroed. IPv6: first three hextets kept. Unparseable: ``-``."""
    try:
        ip = ipaddress.ip_address(address.strip())
    except ValueError:
        return "-"
    if isinstance(ip, ipaddress.IPv6Address):
        mapped = ip.ipv4_mapped
        if mapped is not None:
            ip = mapped
    if isinstance(ip, ipaddress.IPv4Address):
        octets = str(ip).split(".")
        return ".".join(octets[:3]) + ".0"
    hextets = ip.exploded.split(":")[:3]
    return ":".join(format(int(h, 16), "x") for h in hextets) + "::"


class AccessLogMiddleware:
    """Pure ASGI middleware; safe with streaming responses and errors raised downstream."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        start = time.perf_counter()
        status = 500

        async def send_wrapper(message: Message) -> None:
            nonlocal status
            if message["type"] == "http.response.start":
                status = int(message["status"])
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            client = scope.get("client")
            ip = anonymize_ip(str(client[0])) if client else "-"
            duration_ms = (time.perf_counter() - start) * 1000
            access_log.info(
                "%s %s %s %d %.1f",
                ip,
                scope.get("method", "-"),
                scope.get("path", "-"),
                status,
                duration_ms,
            )
