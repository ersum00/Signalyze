"""The engine data copies must be byte-identical to the TypeScript reference files.

Skipped when the monorepo is not present (e.g. inside the Docker image). Re-sync with
``uv run python scripts/sync_engine_data.py``.
"""

from __future__ import annotations

from pathlib import Path

import pytest

API_DIR = Path(__file__).resolve().parents[1]
SIGNALS_DIR = (API_DIR / ".." / ".." / "packages" / "signals").resolve()
DATA_DIR = API_DIR / "signalyze_api" / "engine" / "data"

FILES = {
    "thresholds.json": SIGNALS_DIR / "data" / "thresholds.json",
    "stopwords.json": SIGNALS_DIR / "data" / "stopwords.json",
    "template-phrases.json": SIGNALS_DIR / "data" / "template-phrases.json",
    "sentiment-lexicon.json": SIGNALS_DIR / "data" / "sentiment-lexicon.json",
    "weights.json": SIGNALS_DIR / "src" / "weights.json",
}

pytestmark = pytest.mark.skipif(not SIGNALS_DIR.exists(), reason="packages/signals not present")


@pytest.mark.parametrize("name", sorted(FILES))
def test_data_file_matches_reference(name: str) -> None:
    source = FILES[name]
    copy = DATA_DIR / name
    assert source.exists(), f"reference file missing: {source}"
    assert copy.exists(), f"copy missing: {copy} (run scripts/sync_engine_data.py)"
    assert copy.read_bytes() == source.read_bytes(), (
        f"{name} differs from {source}; run scripts/sync_engine_data.py"
    )
