from __future__ import annotations

import logging
import re

import pytest
from fastapi.testclient import TestClient

from signalyze_api.logging_middleware import anonymize_ip
from signalyze_api.main import create_app
from tests.helpers import make_settings


@pytest.mark.parametrize(
    ("address", "expected"),
    [
        ("203.0.113.42", "203.0.113.0"),
        ("10.0.0.1", "10.0.0.0"),
        ("127.0.0.1", "127.0.0.0"),
        ("2a01:4f8:c0c:1234:5678:9abc:def0:1", "2a01:4f8:c0c::"),
        ("2a01:04f8:0c0c::1", "2a01:4f8:c0c::"),
        ("::1", "0:0:0::"),
        ("::ffff:198.51.100.7", "198.51.100.0"),
        ("testclient", "-"),
        ("", "-"),
        ("not an ip", "-"),
    ],
)
def test_anonymize_ip(address: str, expected: str) -> None:
    assert anonymize_ip(address) == expected


def test_access_log_line_uses_masked_ip_and_no_query(caplog: pytest.LogCaptureFixture) -> None:
    app = create_app(make_settings())
    with (
        caplog.at_level(logging.INFO, logger="signalyze.access"),
        TestClient(app, client=("203.0.113.42", 4321)) as client,
    ):
        assert client.get("/v1/health?secret=1").status_code == 200
    lines = [r.getMessage() for r in caplog.records if r.name == "signalyze.access"]
    assert len(lines) == 1
    assert re.fullmatch(r"203\.0\.113\.0 GET /v1/health 200 \d+\.\d", lines[0]), lines[0]
    assert "secret" not in lines[0]
    assert "203.0.113.42" not in caplog.text
