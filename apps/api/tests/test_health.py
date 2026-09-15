from __future__ import annotations

from fastapi.testclient import TestClient


def test_health_ok(client: TestClient) -> None:
    response = client.get("/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"]
    assert body["engineVersion"] == "1.2.0"
    assert body["cache"] == "memory"


def test_cors_allows_only_configured_extension(client: TestClient) -> None:
    allowed = client.options(
        "/v1/health",
        headers={
            "Origin": "chrome-extension://abcdefghijklmnopabcdefghijklmnop",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert allowed.status_code == 200
    assert (
        allowed.headers["access-control-allow-origin"]
        == "chrome-extension://abcdefghijklmnopabcdefghijklmnop"
    )

    denied = client.options(
        "/v1/health",
        headers={
            "Origin": "https://example.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert "access-control-allow-origin" not in denied.headers


def test_docs_are_disabled(client: TestClient) -> None:
    assert client.get("/docs").status_code == 404
    assert client.get("/openapi.json").status_code == 404


def test_unknown_route_uses_error_shape(client: TestClient) -> None:
    response = client.get("/v1/nothing-here")
    assert response.status_code == 404
    assert response.json() == {"error": "not_found", "message": "Not Found"}


def test_oversized_body_rejected(client: TestClient) -> None:
    response = client.post(
        "/v1/health",
        content=b"{}",
        headers={"Content-Length": str(9 * 1024 * 1024), "Content-Type": "application/json"},
    )
    assert response.status_code == 413
    assert response.json()["error"] == "payload_too_large"
