"""Unit tests for the helper twins of math.ts / text.ts and the analyze wrapper."""

from __future__ import annotations

import datetime as dt

import pytest

from signalyze_api.engine import ENGINE_VERSION, analyze, compute_score, to_js_iso
from signalyze_api.engine.data_files import LANGUAGE_CODES
from signalyze_api.engine.mathutil import (
    add_months,
    clamp01,
    day_number,
    entropy_bits,
    iso_from_day,
    mean,
    median,
    months_between_inclusive,
    ramp,
    round6,
    round_half_up,
)
from signalyze_api.engine.signals.rating_text_mismatch import tone_of
from signalyze_api.engine.text import (
    ENGINE_LANGUAGES,
    MATCH_MODE,
    char_ngrams,
    contains_phrase,
    detect_language,
    jaccard,
    js_trim,
    matches_phrase,
    normalize_text,
    tokenize,
    utf16_length,
)
from signalyze_api.models import Review
from tests.helpers import synthesize_reviews


def test_rounding_is_half_up() -> None:
    assert round6(0.0000005) == 0.000001
    assert round6(0.1234564) == 0.123456
    assert round6(0.1234565) == 0.123457
    assert round6(1.0) == 1.0
    assert isinstance(round6(1), float)
    assert round_half_up(2.5) == 3
    assert round_half_up(2.4999) == 2
    assert isinstance(round_half_up(7.0), int)


def test_clamp_and_ramp() -> None:
    assert clamp01(-0.1) == 0.0
    assert clamp01(1.1) == 1.0
    assert clamp01(0.4) == 0.4
    assert ramp(0.5, 0.0, 1.0) == 0.5
    assert ramp(-1, 0.0, 1.0) == 0.0
    assert ramp(2, 0.0, 1.0) == 1.0
    assert ramp(0.3, 0.3, 0.3) == 1.0
    assert ramp(0.2, 0.3, 0.3) == 0.0


def test_mean_median_entropy() -> None:
    assert mean([]) == 0.0
    assert mean([1, 2, 3, 4]) == 2.5
    assert median([]) == 0.0
    assert median([5, 1, 3]) == 3
    assert median([4, 1, 3, 2]) == 2.5
    assert entropy_bits([]) == 0.0
    assert entropy_bits([0, 0]) == 0.0
    assert entropy_bits([5, 5]) == pytest.approx(1.0)
    assert entropy_bits([7, 0]) == 0.0


def test_day_and_month_helpers() -> None:
    assert day_number("1970-01-01") == 0
    assert day_number("1970-01-02") == 1
    assert day_number("2024-03-01") == 19783
    assert iso_from_day(19783) == "2024-03-01"
    assert iso_from_day(day_number("1999-12-31")) == "1999-12-31"
    assert months_between_inclusive("2024-01", "2024-01") == 1
    assert months_between_inclusive("2023-11", "2024-02") == 4
    assert add_months("2023-11", 0) == "2023-11"
    assert add_months("2023-11", 3) == "2024-02"
    assert add_months("2024-01", -1) == "2023-12"
    assert add_months("2024-01", 24) == "2026-01"


def test_normalize_text_matches_reference_rules() -> None:
    assert normalize_text("  Hello,  WORLD!! ") == "hello world"
    assert normalize_text("snake_case-and-dash") == "snake case and dash"
    assert normalize_text("ﬁne ①") == "fine 1"
    assert normalize_text("Çok güzel, teşekkürler...") == "çok güzel teşekkürler"
    assert normalize_text("a" + chr(0xA0) + "b\tc\nd") == "a b c d"
    assert normalize_text("!!!") == ""
    assert normalize_text("") == ""
    assert normalize_text("emoji \U0001f600 here") == "emoji here"
    assert (
        normalize_text("とても美味しかったです。また来たい！")
        == "とても美味しかったです また来たい"
    )
    assert normalize_text("服务很好，菜很好吃。") == "服务很好 菜很好吃"


def test_tokenize_and_ngrams() -> None:
    assert tokenize("") == []
    assert tokenize("a b") == ["a", "b"]
    assert char_ngrams("abcd", 3) == {"abc", "bcd"}
    assert char_ngrams("ab", 3) == set()
    assert char_ngrams("a b", 3) == {"a b"}


def test_language_table_matches_data_file() -> None:
    assert LANGUAGE_CODES == ENGINE_LANGUAGES
    assert len(ENGINE_LANGUAGES) == 18
    assert [lang for lang in ENGINE_LANGUAGES if MATCH_MODE[lang] == "substring"] == ["ja", "zh"]


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("The staff was very kind and the food was great", "en"),
        ("La comida es muy buena y el trato es genial", "es"),
        ("O atendimento foi excelente e a comida é muito boa", "pt"),
        ("Le service est rapide et le personnel est très sympathique", "fr"),
        ("Wir waren sehr zufrieden und kommen gerne wieder", "de"),
        ("Il personale è gentile e il cibo è ottimo", "it"),
        ("Bu yer çok güzel ve personel çok ilgili", "tr"),
        ("Het eten was heerlijk en de bediening was erg vriendelijk", "nl"),
        ("Jedzenie było pyszne i obsługa bardzo miła", "pl"),
        ("Makanannya enak dan pelayanannya sangat ramah", "id"),
        ("Đồ ăn rất ngon và nhân viên rất nhiệt tình", "vi"),
        ("Maten var god och personalen var mycket trevlig", "sv"),
        ("Очень вкусно и приветливый персонал, рекомендую", "ru"),
        ("Дуже смачно і привітний персонал, рекомендую", "uk"),
        ("Вкусно", "ru"),
        ("الأكل لذيذ والخدمة ممتازة", "ar"),
        ("料理がとても美味しかったです", "ja"),
        ("ラーメン最高", "ja"),
        ("服务很好，菜很好吃", "zh"),
        ("음식이 맛있고 직원분들이 친절해요", "ko"),
        ("Отличное место, Starbucks рядом", "ru"),
        ("服务很好 Starbucks", "zh"),
        ("Lorem ipsum dolor sit amet", "en"),
        ("12 34", "other"),
        ("", "other"),
        ("อาหารอร่อยมาก พนักงานบริการดี", "other"),
        ("खाना बहुत स्वादिष्ट था", "other"),
        ("Το φαγητό ήταν υπέροχο", "other"),
        ("האוכל היה מצוין", "other"),
        ("Το φαγητό ήταν υπέροχο, ok", "other"),
    ],
)
def test_detect_language(text: str, expected: str) -> None:
    assert detect_language(normalize_text(text)) == expected


def test_detect_language_tie_order() -> None:
    # "de" is a stopword of es, pt, fr, nl and tr: the earliest Latin language wins the tie.
    assert detect_language("de") == "es"
    assert detect_language("в на") == "ru"


def test_jaccard_and_phrase_matching() -> None:
    assert jaccard(set(), set()) == 0.0
    assert jaccard({"a"}, set()) == 0.0
    assert jaccard({"a", "b"}, {"b", "c"}) == pytest.approx(1 / 3)
    assert jaccard({"a"}, {"a"}) == 1.0
    assert contains_phrase("highly recommend this", "highly recommend")
    assert not contains_phrase("highly recommended", "highly recommend")
    assert contains_phrase("great food", "great food")
    assert not matches_phrase("highly recommended", "highly recommend", "word")
    assert matches_phrase("highly recommended", "highly recommend", "substring")
    assert matches_phrase("とても美味しかったです", "美味しかったです", "substring")
    assert not matches_phrase("とても美味しかったです", "美味しかったです", "word")


def test_tone_of_word_and_substring_modes() -> None:
    en = normalize_text("Great food but slow service")
    assert tone_of(en, tokenize(en), "en") == 0.0
    assert tone_of(en, tokenize(en), "other") is None
    assert tone_of("很好吃", [], "zh") == 1.0
    assert tone_of("不好吃", [], "zh") == -1.0
    assert tone_of("菜不好吃 但是服务很好吃", [], "zh") == 0.0
    assert tone_of("親切でした", [], "ja") == 1.0
    assert tone_of("不親切でした", [], "ja") == -1.0
    assert tone_of("今日は雨", [], "ja") is None


def test_js_trim_and_utf16_length() -> None:
    assert js_trim(chr(0xFEFF) + " x " + chr(0x3000)) == "x"
    assert js_trim(chr(0x1F) + "x") == chr(0x1F) + "x"
    assert utf16_length("abc") == 3
    assert utf16_length("a\U0001f600") == 3


def test_to_js_iso() -> None:
    assert to_js_iso(dt.datetime(2026, 6, 1, tzinfo=dt.UTC)) == "2026-06-01T00:00:00.000Z"
    assert to_js_iso(dt.datetime(2026, 6, 1, 12, 30, 5, 123999)) == "2026-06-01T12:30:05.123Z"
    plus_two = dt.timezone(dt.timedelta(hours=2))
    assert to_js_iso(dt.datetime(2026, 6, 1, 2, 0, tzinfo=plus_two)) == "2026-06-01T00:00:00.000Z"


def test_compute_score_and_insufficient_data() -> None:
    assert compute_score([]) is None
    reviews = [Review.model_validate(r) for r in synthesize_reviews(14)]
    result = analyze(reviews, "0xa:0xb", "offline", dt.datetime(2026, 6, 1, tzinfo=dt.UTC))
    assert result.status == "insufficient_data"
    assert result.score is None
    assert result.signals == []
    assert result.source == "offline"
    assert result.engineVersion == ENGINE_VERSION == "1.1.0"
    assert result.computedAt == "2026-06-01T00:00:00.000Z"
    sufficient = analyze([*reviews, *reviews], "0xa:0xb", "server")
    assert sufficient.status == "ok"
    assert sufficient.score is not None and 0 <= sufficient.score <= 100
    assert len(sufficient.signals) == 10
