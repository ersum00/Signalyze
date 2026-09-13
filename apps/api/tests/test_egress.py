"""Runtime egress guard: the only HTTP client can reach the configured host and nothing else."""

from __future__ import annotations

import httpx
import pytest

from signalyze_api.egress import BlockedEgressError, allowed_host_of, build_client

BASE_URL = "https://llm.example.test/v1"


def _transport(seen: list[str]) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(str(request.url))
        return httpx.Response(200, json={"ok": True})

    return httpx.MockTransport(handler)


async def test_allowed_host_passes_and_carries_auth() -> None:
    seen: list[str] = []
    async with build_client(BASE_URL, "secret-key", transport=_transport(seen)) as client:
        response = await client.post("chat", json={})
        assert response.status_code == 200
        assert response.request.headers["authorization"] == "Bearer secret-key"
        absolute = await client.get("https://llm.example.test/v1/chat")
        assert absolute.status_code == 200
    assert seen == ["https://llm.example.test/v1/chat", "https://llm.example.test/v1/chat"]


@pytest.mark.parametrize(
    "url",
    [
        "https://maps.example.invalid/x",
        "https://www.google.com/maps",
        "https://maps.googleapis.com/maps/api/place",
        "https://lh3.googleusercontent.com/a",
        "https://evil.llm.example.test/v1/chat",
        "http://llm.example.test.attacker.invalid/",
    ],
)
async def test_other_hosts_are_refused_before_sending(url: str) -> None:
    seen: list[str] = []
    async with build_client(BASE_URL, "secret-key", transport=_transport(seen)) as client:
        with pytest.raises(BlockedEgressError):
            await client.get(url)
    assert seen == []


def test_base_url_must_have_a_host() -> None:
    assert allowed_host_of("https://LLM.Example.test/v1") == "llm.example.test"
    with pytest.raises(ValueError, match="host"):
        build_client("/relative/only", "key")
