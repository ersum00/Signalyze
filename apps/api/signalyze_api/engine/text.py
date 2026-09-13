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

from signalyze_api.engine.data_files import STOPWORDS

EngineLanguage = Literal["en", "tr", "de", "es"]
ENGINE_LANGUAGES: tuple[EngineLanguage, ...] = ("en", "tr", "de", "es")

_STOPWORDS: dict[EngineLanguage, frozenset[str]] = {
    "en": frozenset(STOPWORDS.en),
    "tr": frozenset(STOPWORDS.tr),
    "de": frozenset(STOPWORDS.de),
    "es": frozenset(STOPWORDS.es),
}

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


def detect_language(tokens: Sequence[str]) -> EngineLanguage:
    """Language whose stopwords occur most often; ties resolve in ENGINE_LANGUAGES order."""
    best: EngineLanguage = "en"
    best_hits = 0
    for lang in ENGINE_LANGUAGES:
        stop = _STOPWORDS[lang]
        hits = 0
        for t in tokens:
            if t in stop:
                hits += 1
        if hits > best_hits:
            best_hits = hits
            best = lang
    return best


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
