"""Optional writing-homogeneity step: selection, strict parsing, transport errors, route wiring."""

from __future__ import annotations

import json

import httpx
import pytest
from fastapi.testclient import TestClient

import signalyze_api.llm as llm
from signalyze_api.config import Settings
from signalyze_api.main import create_app
from tests.helpers import analysis_payload, fixture_reviews, load_fixture, make_settings

BASE_URL = "https://llm.example.test/v1"


def enabled_settings() -> Settings:
    return make_settings(llm_base_url=BASE_URL, llm_api_key="secret-key")


def completion(content: str, status: int = 200) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status, json={"choices": [{"message": {"content": content}}]})

    return httpx.MockTransport(handler)


def test_select_texts_longest_by_normalised_length_ties_by_input_order() -> None:
    texts = ["bb", "a", "!!!!!!!!!! cc", "dd", "eee"]
    assert llm.select_texts(texts, limit=3) == ["bb", "!!!!!!!!!! cc", "eee"]
    assert llm.select_texts(texts, limit=2) == ["bb", "eee"]
    assert llm.select_texts([], limit=3) == []
    assert len(llm.select_texts([str(i) * 5 for i in range(100)])) == llm.MAX_TEXTS


@pytest.mark.parametrize(
    ("payload", "expected"),
    [
        ({"choices": [{"message": {"content": '{"homogeneity": 0.83}'}}]}, 0.83),
        ({"choices": [{"message": {"content": ' ```json\n{"homogeneity": 1}\n``` '}}]}, 1.0),
        ({"choices": [{"message": {"content": '{"homogeneity": 0}'}}]}, 0.0),
        ({"choices": [{"message": {"content": "n/a"}}]}, None),
        ({"choices": [{"message": {"content": '{"homogeneity": "0.5"}'}}]}, None),
        ({"choices": [{"message": {"content": '{"homogeneity": true}'}}]}, None),
        ({"choices": [{"message": {"content": '{"homogeneity": 1.5}'}}]}, None),
        ({"choices": [{"message": {"content": '{"other": 0.5}'}}]}, None),
        ({"choices": [{"message": {"content": "[0.5]"}}]}, None),
        ({"choices": []}, None),
        ({"choices": [{"message": {}}]}, None),
        ({}, None),
        ("nope", None),
        (None, None),
    ],
)
def test_parse_homogeneity_is_strict(payload: object, expected: float | None) -> None:
    assert llm.parse_homogeneity(payload) == expected


async def test_writing_homogeneity_success() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(
            200, json={"choices": [{"message": {"content": '{"homogeneity": 0.83}'}}]}
        )

    texts = [f"review text number {i} with some words" for i in range(40)]
    value = await llm.writing_homogeneity(
        texts, enabled_settings(), transport=httpx.MockTransport(handler)
    )
    assert value == 0.83
    assert len(requests) == 1
    request = requests[0]
    assert str(request.url) == "https://llm.example.test/v1/chat/completions"
    assert request.headers["authorization"] == "Bearer secret-key"
    body = json.loads(request.content)
    assert body["model"] == "gpt-4o-mini"
    user_message = body["messages"][-1]["content"]
    assert user_message.count("Text ") == llm.MAX_TEXTS
    assert "reviewerHash" not in request.content.decode()


async def test_writing_homogeneity_malformed_response_is_none(
    caplog: pytest.LogCaptureFixture,
) -> None:
    value = await llm.writing_homogeneity(
        ["a text"], enabled_settings(), transport=completion("n/a")
    )
    assert value is None
    assert any(r.levelname == "WARNING" for r in caplog.records)


async def test_writing_homogeneity_http_error_is_none() -> None:
    value = await llm.writing_homogeneity(
        ["a text"], enabled_settings(), transport=completion("{}", status=500)
    )
    assert value is None


async def test_writing_homogeneity_transport_error_is_none() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("slow")

    value = await llm.writing_homogeneity(
        ["a text"], enabled_settings(), transport=httpx.MockTransport(handler)
    )
    assert value is None


async def test_writing_homogeneity_disabled_makes_no_request() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("must not be called")

    value = await llm.writing_homogeneity(
        ["a text"], make_settings(), transport=httpx.MockTransport(handler)
    )
    assert value is None


def test_route_adds_llm_homogeneity_without_changing_score(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fixture = load_fixture("template")
    if fixture is None:
        pytest.skip("template fixture not available")
    expected = fixture["expected"]
    assert isinstance(expected, dict)
    calls: list[int] = []

    async def fake(texts: list[str], settings: Settings) -> float | None:
        calls.append(len(texts))
        return 0.77

    monkeypatch.setattr(llm, "writing_homogeneity", fake)
    with TestClient(create_app(enabled_settings())) as client:
        body = client.post("/v1/analyze", json=analysis_payload(fixture_reviews("template"))).json()
    assert calls == [150]
    assert body["score"] == expected["score"]
    text_similarity = next(s for s in body["signals"] if s["id"] == "text_similarity")
    assert text_similarity["unusualness"] >= 0.5
    assert text_similarity["details"]["llmHomogeneity"] == 0.77


def test_route_skips_llm_when_text_similarity_is_low(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake(texts: list[str], settings: Settings) -> float | None:
        raise AssertionError("must not be called")

    monkeypatch.setattr(llm, "writing_homogeneity", fake)
    with TestClient(create_app(enabled_settings())) as client:
        body = client.post("/v1/analyze", json=analysis_payload(fixture_reviews("normal"))).json()
    text_similarity = next(s for s in body["signals"] if s["id"] == "text_similarity")
    assert "llmHomogeneity" not in text_similarity["details"]
