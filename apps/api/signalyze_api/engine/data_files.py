"""Typed loaders for the JSON data files shared byte-for-byte with ``packages/signals``.

The copies live in ``signalyze_api/engine/data/`` and are kept in sync by
``scripts/sync_engine_data.py`` (verified by ``tests/test_data_files_in_sync.py``).
Attribute names mirror the JSON keys (camelCase) so signal code reads like the TypeScript.
"""

from __future__ import annotations

import json
from pathlib import Path

from pydantic import BaseModel

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


class LanguageLists(BaseModel):
    en: list[str]
    tr: list[str]
    de: list[str]
    es: list[str]


class LexiconEntry(BaseModel):
    positive: list[str]
    negative: list[str]


class Lexicon(BaseModel):
    en: LexiconEntry
    tr: LexiconEntry
    de: LexiconEntry
    es: LexiconEntry


class WeightsFile(BaseModel):
    version: str
    weights: dict[str, float]


THRESHOLDS = Thresholds.model_validate(_load("thresholds.json"))
STOPWORDS = LanguageLists.model_validate(_load("stopwords.json"))
TEMPLATE_PHRASES = LanguageLists.model_validate(_load("template-phrases.json"))
SENTIMENT_LEXICON = Lexicon.model_validate(_load("sentiment-lexicon.json"))
WEIGHTS_FILE = WeightsFile.model_validate(_load("weights.json"))
