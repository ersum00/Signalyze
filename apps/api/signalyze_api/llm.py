"""Optional writing-homogeneity estimate from an OpenAI-compatible endpoint. Off by default.

Runs only when ``text_similarity`` is already unusual (unusualness >= 0.5). It sends at most
30 review texts and no reviewer data, asks for exactly one number describing how uniform the
writing style is across the whole set, never asks about individual texts, and never changes
the score. Any failure degrades to "no value" with a warning. See docs/METHODOLOGY.md.
"""

from __future__ import annotations

import json
import logging
from collections.abc import Sequence

import httpx

from signalyze_api.config import Settings
from signalyze_api.egress import build_client
from signalyze_api.engine.mathutil import round6
from signalyze_api.engine.text import normalize_text
from signalyze_api.models import AnalysisResult, Review

log = logging.getLogger("signalyze.llm")

MAX_TEXTS = 30
TIMEOUT_SECONDS = 8.0
TRIGGER_UNUSUALNESS = 0.5
DETAIL_KEY = "llmHomogeneity"

SYSTEM_PROMPT = (
    "You estimate how uniform the writing style is across a set of short review texts. "
    "Consider the set as a whole only: sentence structure, vocabulary, length, punctuation "
    'and tone. Reply with exactly one JSON object of the form {"homogeneity": x} where x is '
    "a number from 0 to 1: 0 means the texts read as if written by many different people in "
    "clearly distinct styles, 1 means they read as if written in one identical style. Do not "
    "describe, rate or list individual texts and do not output anything besides the JSON object."
)


def select_texts(texts: Sequence[str], limit: int = MAX_TEXTS) -> list[str]:
    """The ``limit`` longest texts by normalised length (ties keep input order), in input order."""
    ranked = sorted(range(len(texts)), key=lambda i: -len(normalize_text(texts[i])))
    chosen = sorted(ranked[:limit])
    return [texts[i] for i in chosen]


def build_payload(model: str, texts: Sequence[str]) -> dict[str, object]:
    numbered = "\n\n".join(f"Text {i + 1}:\n{text}" for i, text in enumerate(texts))
    return {
        "model": model,
        "temperature": 0,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": numbered},
        ],
    }


def parse_homogeneity(payload: object) -> float | None:
    """Strictly parse a chat-completion response into a 0..1 float; anything else is None."""
    if not isinstance(payload, dict):
        return None
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        return None
    first = choices[0]
    if not isinstance(first, dict):
        return None
    message = first.get("message")
    if not isinstance(message, dict):
        return None
    content = message.get("content")
    if not isinstance(content, str):
        return None
    text = content.strip()
    if text.startswith("```"):
        text = text.strip("`").strip()
        if text.startswith("json"):
            text = text[4:].strip()
    try:
        parsed = json.loads(text)
    except ValueError:
        return None
    if not isinstance(parsed, dict):
        return None
    value = parsed.get("homogeneity")
    if isinstance(value, bool) or not isinstance(value, int | float):
        return None
    if value < 0 or value > 1:
        return None
    return float(value)


async def writing_homogeneity(
    texts: Sequence[str],
    settings: Settings,
    *,
    transport: httpx.AsyncBaseTransport | None = None,
) -> float | None:
    """One chat completion over at most 30 texts; a 0..1 float, or None on any problem."""
    if not settings.llm_enabled:
        return None
    selected = select_texts(texts)
    if not selected:
        return None
    try:
        async with build_client(
            settings.llm_base_url,
            settings.llm_api_key,
            timeout=TIMEOUT_SECONDS,
            transport=transport,
        ) as client:
            response = await client.post(
                "chat/completions", json=build_payload(settings.llm_model, selected)
            )
            response.raise_for_status()
            value = parse_homogeneity(response.json())
    except Exception as exc:
        log.warning("writing homogeneity step failed: %s", type(exc).__name__)
        return None
    if value is None:
        log.warning("writing homogeneity step returned an unusable response")
    return value


async def annotate_text_similarity(
    result: AnalysisResult, reviews: Sequence[Review], settings: Settings
) -> None:
    """Add ``llmHomogeneity`` to the text_similarity details when the optional step applies."""
    if not settings.llm_enabled:
        return
    signal = next((s for s in result.signals if s.id == "text_similarity"), None)
    if signal is None or not signal.available or signal.unusualness < TRIGGER_UNUSUALNESS:
        return
    texts = [r.text for r in reviews if r.text.strip() != ""]
    value = await writing_homogeneity(texts, settings)
    if value is not None:
        signal.details[DETAIL_KEY] = round6(value)
