"""Settings must load from plain environment variables exactly as docker compose passes them."""

from __future__ import annotations

import pytest

from signalyze_api.config import Settings


def test_extension_ids_from_comma_separated_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(
        "EXTENSION_IDS", "mecknkahfceojapfdeaelbapigaijcek, abcdefghijklmnopabcdefghijklmnop"
    )
    monkeypatch.setenv("DATABASE_URL", "")
    settings = Settings(_env_file=None)
    assert settings.extension_ids == [
        "mecknkahfceojapfdeaelbapigaijcek",
        "abcdefghijklmnopabcdefghijklmnop",
    ]
    assert settings.cors_origins == [
        "chrome-extension://mecknkahfceojapfdeaelbapigaijcek",
        "chrome-extension://abcdefghijklmnopabcdefghijklmnop",
    ]


def test_single_extension_id_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EXTENSION_IDS", "mecknkahfceojapfdeaelbapigaijcek")
    settings = Settings(_env_file=None)
    assert settings.extension_ids == ["mecknkahfceojapfdeaelbapigaijcek"]


def test_empty_extension_ids_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EXTENSION_IDS", "")
    settings = Settings(_env_file=None)
    assert settings.extension_ids == []
    assert settings.cors_origins == []


def test_llm_disabled_unless_both_values_present(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EXTENSION_IDS", "")
    monkeypatch.setenv("LLM_BASE_URL", "https://llm.example.test/v1")
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    assert Settings(_env_file=None).llm_enabled is False
    monkeypatch.setenv("LLM_API_KEY", "k")
    assert Settings(_env_file=None).llm_enabled is True
