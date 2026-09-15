"""Pydantic models mirroring ``packages/shared/src/schemas.ts``.

Field names are kept in camelCase on purpose so the JSON wire format is identical to the
zod schemas without alias machinery. A ``Review`` never carries a reviewer name, profile
link, avatar or user id; unknown fields are rejected (``extra="forbid"``) so such data
cannot be accepted by accident. See docs/PRIVACY.md.
"""

from __future__ import annotations

import datetime as dt
import re
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

# --- constants shared with packages/shared/src/constants.ts ---------------------------------

MIN_REVIEWS_FOR_SCORE = 15
MAX_REVIEWS_PER_REQUEST = 2000
CACHE_TTL_DAYS = 7

SUPPORTED_LOCALES: tuple[str, ...] = ("en", "tr", "de", "es")
Locale = Literal["en", "tr", "de", "es"]

PLACE_ID_PATTERN = r"^[A-Za-z0-9_:\-.!]+$"
REVIEWER_HASH_PATTERN = r"^[0-9a-f]{64}$"
_ISO_DAY = re.compile(r"^\d{4}-\d{2}-\d{2}$")

SignalId = Literal[
    "burst_ratio",
    "rating_polarity",
    "single_review_accounts",
    "no_photo_short_text",
    "text_similarity",
    "template_phrases",
    "rating_text_mismatch",
    "date_entropy",
    "local_guide_ratio",
    "owner_response_pattern",
]

# Canonical evaluation order (packages/shared/src/signal-definitions.ts).
SIGNAL_IDS: tuple[SignalId, ...] = (
    "burst_ratio",
    "rating_polarity",
    "single_review_accounts",
    "no_photo_short_text",
    "text_similarity",
    "template_phrases",
    "rating_text_mismatch",
    "date_entropy",
    "local_guide_ratio",
    "owner_response_pattern",
)

PlaceId = Annotated[str, Field(min_length=4, max_length=512, pattern=PLACE_ID_PATTERN)]

# --- request ---------------------------------------------------------------------------------


class Review(BaseModel):
    """A single review as sent by the extension. Contains no reviewer identity."""

    model_config = ConfigDict(extra="forbid")

    reviewerHash: str = Field(pattern=REVIEWER_HASH_PATTERN)
    rating: int = Field(ge=1, le=5)
    date: str
    text: str = Field(max_length=2000)
    reviewerReviewCount: int | None = Field(ge=0)
    photoCount: int = Field(ge=0)
    localGuideLevel: int | None = Field(ge=1, le=10)
    ownerResponse: str | None = Field(max_length=2000)
    language: str | None = Field(max_length=10)

    @field_validator("date")
    @classmethod
    def _calendar_day(cls, value: str) -> str:
        if not _ISO_DAY.match(value):
            raise ValueError("expected YYYY-MM-DD")
        try:
            dt.date.fromisoformat(value)
        except ValueError as exc:
            raise ValueError("invalid calendar day") from exc
        return value


class AnalysisRequest(BaseModel):
    placeId: PlaceId
    reviews: list[Review] = Field(min_length=1, max_length=MAX_REVIEWS_PER_REQUEST)
    totalReviewCount: int | None = Field(ge=0)
    overallRating: float | None = Field(ge=1, le=5)
    locale: Locale = "en"
    clientVersion: str = Field(max_length=32)


# --- result ----------------------------------------------------------------------------------

SignalDetailValue = bool | int | float | str | None
SignalDetails = dict[str, SignalDetailValue]


class SignalResult(BaseModel):
    id: SignalId
    unusualness: float = Field(ge=0, le=1)
    value: float
    details: SignalDetails
    available: bool


class MonthlyCount(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    count: int = Field(ge=0)


class RatingDistribution(BaseModel):
    """Counts per star; serialised with the keys "1".."5" like the zod schema."""

    model_config = ConfigDict(serialize_by_alias=True, validate_by_alias=True)

    one: int = Field(alias="1", ge=0)
    two: int = Field(alias="2", ge=0)
    three: int = Field(alias="3", ge=0)
    four: int = Field(alias="4", ge=0)
    five: int = Field(alias="5", ge=0)


class ReviewerProfileSummary(BaseModel):
    singleReviewShare: float | None = Field(ge=0, le=1)
    medianReviewCount: float | None = Field(ge=0)
    localGuideShare: float | None = Field(ge=0, le=1)
    withPhotosShare: float = Field(ge=0, le=1)


ResultSource = Literal["server", "server-cache", "offline"]


class AnalysisResult(BaseModel):
    placeId: PlaceId
    score: int | None = Field(ge=0, le=100)
    status: Literal["ok", "insufficient_data"]
    reviewCount: int = Field(ge=0)
    signals: list[SignalResult]
    monthly: list[MonthlyCount]
    ratingDistribution: RatingDistribution
    reviewerProfile: ReviewerProfileSummary
    source: ResultSource
    engineVersion: str
    computedAt: str


class HealthResponse(BaseModel):
    status: Literal["ok"]
    version: str
    engineVersion: str
    cache: Literal["postgres", "memory"]


class ApiError(BaseModel):
    error: str
    message: str
