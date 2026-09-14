"""Typed loaders for the JSON data files shared byte-for-byte with ``packages/signals``.

The copies live in ``signalyze_api/engine/data/`` and are kept in sync by
``scripts/sync_engine_data.py`` (verified by ``tests/test_data_files_in_sync.py``).
Attribute names mirror the JSON keys (camelCase) so signal code reads like the TypeScript.
"""

from __future__ import annotations

import json
from collections.abc import Sequence
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, TypeAdapter

DATA_DIR = Path(__file__).resolve().parent / "data"


def _load(name: str) -> object:
    with (DATA_DIR / name).open("r", encoding="utf-8") as handle:
        return json.load(handle)


class BurstRatioThresholds(BaseModel):
    excessLow: float
    excessHigh: float
    windowDays: int


class LowHighThresholds(BaseModel):
    low: float
    high: float


class SingleReviewAccountsThresholds(LowHighThresholds):
    minKnown: int


class NoPhotoShortTextThresholds(LowHighThresholds):
    shortTextChars: int


class TextSimilarityThresholds(BaseModel):
    meanLow: float
    meanHigh: float
    pairShareLow: float
    pairShareHigh: float
    pairThreshold: float
    ngramSize: int
    minTextChars: int
    minEligible: int
    maxEligible: int


class TemplatePhrasesThresholds(LowHighThresholds):
    coverageThreshold: float
    minWithText: int


class RatingTextMismatchThresholds(LowHighThresholds):
    minScored: int
    toneThreshold: float


class DateEntropyThresholds(LowHighThresholds):
    minMonths: int


class LocalGuideRatioThresholds(BaseModel):
    establishedLevel: int
    shareLow: float
    shareHigh: float


class OwnerResponsePatternThresholds(LowHighThresholds):
    minResponded: int


class Thresholds(BaseModel):
    version: str
    burst_ratio: BurstRatioThresholds
    rating_polarity: LowHighThresholds
    single_review_accounts: SingleReviewAccountsThresholds
    no_photo_short_text: NoPhotoShortTextThresholds
    text_similarity: TextSimilarityThresholds
    template_phrases: TemplatePhrasesThresholds
    rating_text_mismatch: RatingTextMismatchThresholds
    date_entropy: DateEntropyThresholds
    local_guide_ratio: LocalGuideRatioThresholds
    owner_response_pattern: OwnerResponsePatternThresholds


Script = Literal["latin", "cyrillic", "arabic", "japanese", "han", "hangul"]
MatchMode = Literal["word", "substring"]


class LanguageEntry(BaseModel):
    """One row of languages.json: a language code, the script that identifies it, its match mode."""

    code: str
    script: Script
    matchMode: MatchMode


class LanguagesFile(BaseModel):
    languages: list[LanguageEntry]


class LexiconEntry(BaseModel):
    positive: list[str]
    negative: list[str]


class WeightsFile(BaseModel):
    version: str
    weights: dict[str, float]


_WORD_LIST = TypeAdapter(list[str])


def _object_file(name: str) -> dict[str, object]:
    raw = _load(name)
    if not isinstance(raw, dict):
        raise TypeError(f"{name}: expected a JSON object at the top level")
    return {str(key): value for key, value in raw.items()}


def _per_language_lists(name: str, codes: Sequence[str]) -> dict[str, list[str]]:
    """The word list of every language code (a missing language is a load-time error)."""
    raw = _object_file(name)
    return {code: _WORD_LIST.validate_python(raw[code]) for code in codes}


def _per_language_lexicon(name: str, codes: Sequence[str]) -> dict[str, LexiconEntry]:
    raw = _object_file(name)
    return {code: LexiconEntry.model_validate(raw[code]) for code in codes}


THRESHOLDS = Thresholds.model_validate(_load("thresholds.json"))
LANGUAGES = LanguagesFile.model_validate(_load("languages.json"))
LANGUAGE_CODES: tuple[str, ...] = tuple(entry.code for entry in LANGUAGES.languages)
STOPWORDS = _per_language_lists("stopwords.json", LANGUAGE_CODES)
TEMPLATE_PHRASES = _per_language_lists("template-phrases.json", LANGUAGE_CODES)
SENTIMENT_LEXICON = _per_language_lexicon("sentiment-lexicon.json", LANGUAGE_CODES)
WEIGHTS_FILE = WeightsFile.model_validate(_load("weights.json"))
