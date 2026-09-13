"""Shared test helpers: settings factory, fixture loading and synthetic review data."""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import random
from pathlib import Path

from signalyze_api.config import Settings

API_DIR = Path(__file__).resolve().parents[1]
FIXTURE_DIR = (API_DIR / ".." / ".." / "packages" / "signals" / "fixtures").resolve()
EXTENSION_ID = "abcdefghijklmnopabcdefghijklmnop"
PLACE_ID = "0xtest:0xplace"

VOCABULARY = (
    "the coffee was really good and the staff were friendly we came for lunch on a sunday "
    "service slow but food fresh tasty portions generous prices fair would come back again "
    "parking difficult terrace view lovely evening music loud dessert excellent waiter "
    "attentive menu varied location central clean tables small"
).split()


def make_settings(
    *,
    analyze_rate_limit: str = "60/hour",
    llm_base_url: str = "",
    llm_api_key: str = "",
    cache_ttl_days: int = 7,
) -> Settings:
    return Settings(
        database_url="",
        extension_ids=[EXTENSION_ID],
        analyze_rate_limit=analyze_rate_limit,
        llm_base_url=llm_base_url,
        llm_api_key=llm_api_key,
        cache_ttl_days=cache_ttl_days,
    )


def load_fixture(name: str) -> dict[str, object] | None:
    path = FIXTURE_DIR / f"{name}.json"
    if not path.exists():
        return None
    data: dict[str, object] = json.loads(path.read_text(encoding="utf-8"))
    return data


def fixture_reviews(name: str, fallback_count: int = 20) -> list[dict[str, object]]:
    fixture = load_fixture(name)
    if fixture is None:
        return synthesize_reviews(fallback_count)
    reviews = fixture["reviews"]
    assert isinstance(reviews, list)
    return list(reviews)


def synthesize_reviews(n: int, *, seed: int = 7, text_chars: int = 80) -> list[dict[str, object]]:
    rng = random.Random(seed)
    start = dt.date(2024, 1, 5)
    out: list[dict[str, object]] = []
    for i in range(n):
        words: list[str] = []
        total = 0
        while total < text_chars:
            word = rng.choice(VOCABULARY)
            words.append(word)
            total += len(word) + 1
        text = " ".join(words)[:text_chars]
        day = start + dt.timedelta(days=(i * 11) % 700)
        out.append(
            {
                "reviewerHash": hashlib.sha256(f"{seed}:{i}".encode()).hexdigest(),
                "rating": [5, 4, 5, 3, 1, 5, 4, 2][i % 8],
                "date": day.isoformat(),
                "text": text,
                "reviewerReviewCount": rng.randint(0, 60),
                "photoCount": i % 3,
                "localGuideLevel": None if i % 4 else rng.randint(1, 8),
                "ownerResponse": "Thank you for your visit." if i % 5 == 0 else None,
                "language": None,
            }
        )
    return out


def analysis_payload(
    reviews: list[dict[str, object]], place_id: str = PLACE_ID
) -> dict[str, object]:
    return {
        "placeId": place_id,
        "reviews": reviews,
        "totalReviewCount": len(reviews),
        "overallRating": 4.2,
        "locale": "en",
        "clientVersion": "0.1.0",
    }
