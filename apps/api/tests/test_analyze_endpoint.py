"""POST /v1/analyze and GET /v1/place/{place_id} through the in-memory cache."""

from __future__ import annotations

from fastapi.testclient import TestClient

from signalyze_api.models import SIGNAL_IDS
from tests.helpers import PLACE_ID, analysis_payload, fixture_reviews, synthesize_reviews


def test_analyze_happy_path(client: TestClient) -> None:
    response = client.post("/v1/analyze", json=analysis_payload(fixture_reviews("normal")))
    assert response.status_code == 200
    body = response.json()
    assert body["placeId"] == PLACE_ID
    assert body["status"] == "ok"
    assert body["source"] == "server"
    assert body["engineVersion"] == "1.2.0"
    assert isinstance(body["score"], int) and 0 <= body["score"] <= 100
    assert [s["id"] for s in body["signals"]] == list(SIGNAL_IDS)
    assert body["computedAt"].endswith("Z") and len(body["computedAt"]) == 24
    assert set(body["ratingDistribution"]) == {"1", "2", "3", "4", "5"}
    assert sum(body["ratingDistribution"].values()) == body["reviewCount"]
    assert set(body["reviewerProfile"]) == {
        "singleReviewShare",
        "medianReviewCount",
        "localGuideShare",
        "withPhotosShare",
    }


def test_second_call_is_served_from_cache(client: TestClient) -> None:
    payload = analysis_payload(fixture_reviews("normal"))
    first = client.post("/v1/analyze", json=payload).json()
    second = client.post("/v1/analyze", json=payload).json()
    assert first["source"] == "server"
    assert second["source"] == "server-cache"
    assert second["score"] == first["score"]
    assert second["computedAt"] == first["computedAt"]
    assert second["signals"] == first["signals"]


def test_larger_sample_recomputes(client: TestClient) -> None:
    small = analysis_payload(synthesize_reviews(20))
    large = analysis_payload(synthesize_reviews(25))
    assert client.post("/v1/analyze", json=small).json()["source"] == "server"
    recomputed = client.post("/v1/analyze", json=large).json()
    assert recomputed["source"] == "server"
    assert recomputed["reviewCount"] == 25
    assert client.post("/v1/analyze", json=small).json()["source"] == "server-cache"


def test_place_lookup_404_then_200(client: TestClient) -> None:
    missing = client.get(f"/v1/place/{PLACE_ID}")
    assert missing.status_code == 404
    assert missing.json()["error"] == "not_found"
    assert missing.json()["message"]

    client.post("/v1/analyze", json=analysis_payload(fixture_reviews("normal")))
    found = client.get(f"/v1/place/{PLACE_ID}")
    assert found.status_code == 200
    assert found.json()["source"] == "server-cache"
    assert found.json()["placeId"] == PLACE_ID


def test_place_lookup_validates_place_id(client: TestClient) -> None:
    response = client.get("/v1/place/bad id")
    assert response.status_code == 422
    assert response.json()["error"] == "invalid_request"


def test_insufficient_data(client: TestClient) -> None:
    response = client.post("/v1/analyze", json=analysis_payload(synthesize_reviews(10)))
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "insufficient_data"
    assert body["score"] is None
    assert body["signals"] == []
    assert body["reviewCount"] == 10
    assert len(body["monthly"]) >= 1


def test_reviewer_identity_fields_are_rejected(client: TestClient) -> None:
    reviews = synthesize_reviews(20)
    reviews[0]["reviewerName"] = "Some Person"
    response = client.post("/v1/analyze", json=analysis_payload(reviews))
    assert response.status_code == 422
    body = response.json()
    assert body["error"] == "invalid_request"
    assert body["message"] == "Request validation failed."
    assert any("reviewerName" in detail["loc"] for detail in body["details"])
    assert "Some Person" not in response.text


def test_invalid_calendar_day_is_rejected(client: TestClient) -> None:
    reviews = synthesize_reviews(20)
    reviews[3]["date"] = "2024-02-30"
    response = client.post("/v1/analyze", json=analysis_payload(reviews))
    assert response.status_code == 422
    assert response.json()["error"] == "invalid_request"


def test_empty_reviews_rejected(client: TestClient) -> None:
    response = client.post("/v1/analyze", json=analysis_payload([]))
    assert response.status_code == 422


def test_daily_stats_are_counted(client: TestClient) -> None:
    payload = analysis_payload(fixture_reviews("normal"))
    client.post("/v1/analyze", json=payload)
    client.post("/v1/analyze", json=payload)
    cache = client.app.state.cache  # type: ignore[attr-defined]
    stats = list(cache.daily_stats.values())
    assert len(stats) == 1
    assert stats[0].analyze_calls == 2
    assert stats[0].cache_hits == 1
