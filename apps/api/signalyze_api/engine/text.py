"""Text helpers. Line-for-line twin of ``packages/signals/src/text.ts``.

All lengths are counted in Unicode code points so both runtimes agree, except where the
reference deliberately relies on JavaScript's UTF-16 ``String.length`` (see
:func:`utf16_length`).
"""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Sequence
from typing import Literal

from signalyze_api.engine.data_files import (
    LANGUAGES,
    STOPWORDS,
    LanguageEntry,
    MatchMode,
    Script,
)

# Languages with a phrase dictionary and a tone lexicon, in the order of
# data/languages.json (which is also the tie order of the stopword vote).
EngineLanguage = Literal[
    "en",
    "es",
    "pt",
    "fr",
    "de",
    "it",
    "tr",
    "nl",
    "pl",
    "id",
    "vi",
    "sv",
    "ru",
    "uk",
    "ar",
    "ja",
    "zh",
    "ko",
]
ENGINE_LANGUAGES: tuple[EngineLanguage, ...] = (
    "en",
    "es",
    "pt",
    "fr",
    "de",
    "it",
    "tr",
    "nl",
    "pl",
    "id",
    "vi",
    "sv",
    "ru",
    "uk",
    "ar",
    "ja",
    "zh",
    "ko",
)
# Detection result: a dictionary language, or "other" when no dictionary applies.
DetectedLanguage = EngineLanguage | Literal["other"]


def _as_engine_language(code: str) -> EngineLanguage:
    if code not in ENGINE_LANGUAGES:
        raise ValueError(f"languages.json: unknown language {code!r}")
    return code


def _language_table() -> dict[EngineLanguage, LanguageEntry]:
    table = {_as_engine_language(entry.code): entry for entry in LANGUAGES.languages}
    if tuple(table) != ENGINE_LANGUAGES:
        raise ValueError("languages.json and text.py disagree on the engine languages")
    return table


LANGUAGE_TABLE: dict[EngineLanguage, LanguageEntry] = _language_table()

# How phrases and lexicon entries are matched per language (from languages.json).
MATCH_MODE: dict[EngineLanguage, MatchMode] = {
    lang: LANGUAGE_TABLE[lang].matchMode for lang in ENGINE_LANGUAGES
}


def _languages_of_script(script: Script) -> tuple[EngineLanguage, ...]:
    codes = tuple(lang for lang in ENGINE_LANGUAGES if LANGUAGE_TABLE[lang].script == script)
    if len(codes) == 0:
        raise ValueError(f"languages.json has no {script} language")
    return codes


# Candidates of the stopword vote per script, in tie order; the first is the default.
_LATIN_LANGUAGES = _languages_of_script("latin")
_CYRILLIC_LANGUAGES = _languages_of_script("cyrillic")


def _stopword_index() -> dict[str, tuple[EngineLanguage, ...]]:
    """token -> languages whose stopword list contains it (ENGINE_LANGUAGES order)."""
    index: dict[str, list[EngineLanguage]] = {}
    for lang in ENGINE_LANGUAGES:
        for word in STOPWORDS[lang]:
            index.setdefault(word, []).append(lang)
    return {word: tuple(langs) for word, langs in index.items()}


_STOPWORD_LANGUAGES = _stopword_index()

# Characters removed by JavaScript's String.prototype.trim (WhiteSpace and
# LineTerminator), listed as code points so the source stays ASCII.
_JS_WHITESPACE_CODE_POINTS = (
    0x09,
    0x0A,
    0x0B,
    0x0C,
    0x0D,
    0x20,
    0xA0,
    0x1680,
    0x2000,
    0x2001,
    0x2002,
    0x2003,
    0x2004,
    0x2005,
    0x2006,
    0x2007,
    0x2008,
    0x2009,
    0x200A,
    0x2028,
    0x2029,
    0x202F,
    0x205F,
    0x3000,
    0xFEFF,
)
JS_WHITESPACE = "".join(chr(cp) for cp in _JS_WHITESPACE_CODE_POINTS)

# Python's \w is letters + numbers + underscore, so the underscore is listed explicitly to
# match the reference /[^\p{L}\p{N}\s]+/u. Runs collapse to one space in the next step.
_NON_WORD = re.compile(r"[^\w\s]|_")
_SPACES = re.compile(r"\s+")


def js_trim(text: str) -> str:
    """``String.prototype.trim`` equivalent."""
    return text.strip(JS_WHITESPACE)


def normalize_text(text: str) -> str:
    """NFKC, lower-case, keep letters/digits/whitespace, collapse whitespace, trim."""
    lowered = unicodedata.normalize("NFKC", text).lower()
    spaced = _NON_WORD.sub(" ", lowered)
    return _SPACES.sub(" ", spaced).strip()


def code_point_length(text: str) -> int:
    return len(text)


def utf16_length(text: str) -> int:
    """JavaScript ``String.length`` (UTF-16 code units) for the one place the reference uses it."""
    extra = 0
    for ch in text:
        if ord(ch) > 0xFFFF:
            extra += 1
    return len(text) + extra


def tokenize(normalized: str) -> list[str]:
    if normalized == "":
        return []
    return normalized.split(" ")


ScriptBucket = Literal["kana", "hangul", "han", "arabic", "cyrillic", "latin", "other"]


def _script_of(cp: int) -> ScriptBucket | None:
    """Script bucket of one code point of normalised text, or None for space and ASCII digits.

    The ranges are Unicode blocks and are exactly those of the reference ``scriptOf``.
    """
    if cp <= 0x7F:
        return "latin" if 0x61 <= cp <= 0x7A else None
    if (
        0xC0 <= cp <= 0x24F
        or 0x1E00 <= cp <= 0x1EFF
        or 0x2C60 <= cp <= 0x2C7F
        or 0xA720 <= cp <= 0xA7FF
    ):
        return "latin"
    if 0x400 <= cp <= 0x52F:
        return "cyrillic"
    if (
        0x600 <= cp <= 0x6FF
        or 0x750 <= cp <= 0x77F
        or 0x8A0 <= cp <= 0x8FF
        or 0xFB50 <= cp <= 0xFDFF
        or 0xFE70 <= cp <= 0xFEFE
    ):
        return "arabic"
    if 0x3040 <= cp <= 0x30FF or 0x31F0 <= cp <= 0x31FF or 0xFF66 <= cp <= 0xFF9F:
        return "kana"
    if (
        0x1100 <= cp <= 0x11FF
        or 0x3130 <= cp <= 0x318F
        or 0xA960 <= cp <= 0xA97F
        or 0xAC00 <= cp <= 0xD7FF
    ):
        return "hangul"
    if (
        0x3005 <= cp <= 0x3007
        or 0x3400 <= cp <= 0x4DBF
        or 0x4E00 <= cp <= 0x9FFF
        or 0xF900 <= cp <= 0xFAFF
        or 0x20000 <= cp <= 0x3134F
    ):
        return "han"
    return "other"


def _stopword_vote(tokens: Sequence[str], candidates: tuple[EngineLanguage, ...]) -> EngineLanguage:
    """Most stopword hits among ``candidates``; ties to the earlier one, no hits to the first."""
    hits: dict[EngineLanguage, int] = {}
    for t in tokens:
        langs = _STOPWORD_LANGUAGES.get(t)
        if langs is None:
            continue
        for lang in langs:
            hits[lang] = hits.get(lang, 0) + 1
    best = candidates[0]
    best_hits = 0
    for lang in candidates:
        h = hits.get(lang, 0)
        if h > best_hits:
            best_hits = h
            best = lang
    return best


def detect_language(normalized: str) -> DetectedLanguage:
    """Language of a normalised text; the script of its letters decides first.

    Any kana -> ja, any Hangul -> ko, any Han -> zh, any Arabic letter -> ar. Cyrillic and
    Latin texts vote with the stopword lists of the languages of that script (most hits wins,
    ties in languages.json order, the script's first language when nothing matches: ru and
    en). Texts whose letters are mostly of another script, or without letters, are "other".
    """
    counts: dict[ScriptBucket, int] = {
        "kana": 0,
        "hangul": 0,
        "han": 0,
        "arabic": 0,
        "cyrillic": 0,
        "latin": 0,
        "other": 0,
    }
    for ch in normalized:
        bucket = _script_of(ord(ch))
        if bucket is not None:
            counts[bucket] += 1
    if counts["kana"] > 0:
        return "ja"
    if counts["hangul"] > 0:
        return "ko"
    if counts["han"] > 0:
        return "zh"
    if counts["arabic"] > 0:
        return "ar"
    if counts["cyrillic"] > 0:
        return _stopword_vote(tokenize(normalized), _CYRILLIC_LANGUAGES)
    if counts["latin"] > 0 and counts["latin"] >= counts["other"]:
        return _stopword_vote(tokenize(normalized), _LATIN_LANGUAGES)
    return "other"


def char_ngrams(normalized: str, n: int) -> set[str]:
    """Character n-gram set over code points (spaces included)."""
    return {normalized[i : i + n] for i in range(len(normalized) - n + 1)}


def jaccard(a: set[str], b: set[str]) -> float:
    if len(a) == 0 and len(b) == 0:
        return 0.0
    inter = len(a & b)
    union = len(a) + len(b) - inter
    return 0.0 if union == 0 else inter / union


def contains_phrase(normalized: str, phrase: str) -> bool:
    """Whole-word substring test on normalised text."""
    return f" {phrase} " in f" {normalized} "


def matches_phrase(normalized: str, phrase: str, mode: MatchMode) -> bool:
    """Phrase test: whole words in "word" mode, plain substring in "substring" mode."""
    return contains_phrase(normalized, phrase) if mode == "word" else phrase in normalized
