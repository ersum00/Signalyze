from __future__ import annotations

import pytest
from pydantic import ValidationError

from signalyze_api.models import AnalysisRequest, Review
from tests.helpers import synthesize_reviews


def valid_review() -> dict[str, object]:
    return synthesize_reviews(1)[0]


def test_review_accepts_fixture_shape() -> None:
    review = Review.model_validate(valid_review())
    assert review.rating in {1, 2, 3, 4, 5}
    assert len(review.reviewerHash) == 64


@pytest.mark.parametrize("day", ["2024-02-30", "2024-13-01", "2024-1-5", "20240105", "abcd-ef-gh"])
def test_review_rejects_non_calendar_days(day: str) -> None:
    data = valid_review()
    data["date"] = day
    with pytest.raises(ValidationError):
        Review.model_validate(data)


def test_review_accepts_leap_day() -> None:
    data = valid_review()
    data["date"] = "2024-02-29"
    assert Review.model_validate(data).date == "2024-02-29"


def test_review_rejects_identity_fields() -> None:
    for field in ("reviewerName", "profileUrl", "avatar", "userId"):
        data = valid_review()
        data[field] = "x"
        with pytest.raises(ValidationError):
            Review.model_validate(data)


def test_review_rejects_bad_hash_and_ranges() -> None:
    for field, value in (
        ("reviewerHash", "abc"),
        ("reviewerHash", "G" * 64),
        ("rating", 0),
        ("rating", 6),
        ("photoCount", -1),
        ("localGuideLevel", 11),
        ("reviewerReviewCount", -1),
        ("text", "x" * 2001),
        ("language", "x" * 11),
    ):
        data = valid_review()
        data[field] = value
        with pytest.raises(ValidationError):
            Review.model_validate(data)


def test_request_defaults_and_limits() -> None:
    request = AnalysisRequest.model_validate(
        {
            "placeId": "0x14cab:0x8e3f",
            "reviews": synthesize_reviews(2),
            "totalReviewCount": None,
            "overallRating": None,
            "clientVersion": "0.1.0",
        }
    )
    assert request.locale == "en"
    for bad_place_id in ("abc", "has space", "x" * 513, "semi;colon"):
        with pytest.raises(ValidationError):
            AnalysisRequest.model_validate(
                {
                    "placeId": bad_place_id,
                    "reviews": synthesize_reviews(1),
                    "totalReviewCount": 1,
                    "overallRating": 4.5,
                    "clientVersion": "0.1.0",
                }
            )
    with pytest.raises(ValidationError):
        AnalysisRequest.model_validate(
            {
                "placeId": "0x1:0x2",
                "reviews": [],
                "totalReviewCount": 0,
                "overallRating": None,
                "clientVersion": "0.1.0",
            }
        )
