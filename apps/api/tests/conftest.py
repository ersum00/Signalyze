from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from signalyze_api.config import Settings
from signalyze_api.main import create_app
from tests.helpers import make_settings


@pytest.fixture
def settings() -> Settings:
    return make_settings()


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    # The context manager runs the lifespan; DATABASE_URL is empty so the cache is in-memory.
    with TestClient(create_app(settings)) as test_client:
        yield test_client
