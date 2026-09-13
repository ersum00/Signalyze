from __future__ import annotations

from fastapi.testclient import TestClient

from signalyze_api.main import create_app
from tests.helpers import analysis_payload, make_settings, synthesize_reviews


def test_rate_limit_returns_429_with_error_body() -> None:
    app = create_app(make_settings(analyze_rate_limit="2/minute"))
    payload = analysis_payload(synthesize_reviews(20))
    with TestClient(app) as client:
        assert client.post("/v1/analyze", json=payload).status_code == 200
        assert client.post("/v1/analyze", json=payload).status_code == 200
        third = client.post("/v1/analyze", json=payload)
        assert third.status_code == 429
        body = third.json()
        assert body["error"] == "rate_limited"
        assert body["message"]
        # Other endpoints are not limited.
        assert client.get("/v1/health").status_code == 200


def test_rate_limit_is_per_app_instance() -> None:
    payload = analysis_payload(synthesize_reviews(20))
    for _ in range(2):
        with TestClient(create_app(make_settings(analyze_rate_limit="1/minute"))) as client:
            assert client.post("/v1/analyze", json=payload).status_code == 200
            assert client.post("/v1/analyze", json=payload).status_code == 429
