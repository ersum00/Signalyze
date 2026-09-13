"""Runtime configuration loaded from environment / .env."""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = Field(default="", description="asyncpg DSN; empty disables the cache")
    # NoDecode: the env source must hand over the raw "id1,id2" string instead of
    # trying to JSON-decode it; _split_ids then splits on commas.
    extension_ids: Annotated[list[str], NoDecode] = Field(default_factory=list)
    port: int = 8090
    llm_base_url: str = ""
    llm_api_key: str = ""
    # Model name sent to the OpenAI-compatible endpoint (only used when llm_enabled).
    llm_model: str = "gpt-4o-mini"
    certbot_email: str = ""

    # Rate limit: analyses per IP per hour.
    analyze_rate_limit: str = "60/hour"
    # Reject request bodies larger than this (bytes). Also enforced by the edge proxy.
    max_body_bytes: int = 2 * 1024 * 1024
    cache_ttl_days: int = 7

    @field_validator("extension_ids", mode="before")
    @classmethod
    def _split_ids(cls, value: object) -> list[str]:
        if isinstance(value, str):
            return [part.strip() for part in value.split(",") if part.strip()]
        if isinstance(value, list):
            return [str(v).strip() for v in value if str(v).strip()]
        return []

    @property
    def cors_origins(self) -> list[str]:
        return [f"chrome-extension://{ext_id}" for ext_id in self.extension_ids]

    @property
    def llm_enabled(self) -> bool:
        return bool(self.llm_base_url and self.llm_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
