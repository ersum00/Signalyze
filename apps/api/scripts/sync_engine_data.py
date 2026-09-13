"""Copy the engine data files from the TypeScript reference into the Python package.

The signal engine's calibration points, stopword lists, phrase dictionaries, tone lexicons
and score weights are owned by ``packages/signals`` and must be byte-identical on both
sides. Run from ``apps/api`` after changing any of them::

    uv run python scripts/sync_engine_data.py

Copies
    packages/signals/data/thresholds.json
    packages/signals/data/stopwords.json
    packages/signals/data/template-phrases.json
    packages/signals/data/sentiment-lexicon.json
    packages/signals/src/weights.json
into ``signalyze_api/engine/data/``. ``tests/test_data_files_in_sync.py`` fails when the
copies drift from the reference.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

API_DIR = Path(__file__).resolve().parents[1]
SIGNALS_DIR = (API_DIR / ".." / ".." / "packages" / "signals").resolve()
DATA_DIR = API_DIR / "signalyze_api" / "engine" / "data"

FILES: dict[str, Path] = {
    "thresholds.json": SIGNALS_DIR / "data" / "thresholds.json",
    "stopwords.json": SIGNALS_DIR / "data" / "stopwords.json",
    "template-phrases.json": SIGNALS_DIR / "data" / "template-phrases.json",
    "sentiment-lexicon.json": SIGNALS_DIR / "data" / "sentiment-lexicon.json",
    "weights.json": SIGNALS_DIR / "src" / "weights.json",
}


def main() -> int:
    if not SIGNALS_DIR.exists():
        print(f"reference package not found: {SIGNALS_DIR}", file=sys.stderr)
        return 1
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    for name, source in FILES.items():
        if not source.exists():
            print(f"missing reference file: {source}", file=sys.stderr)
            return 1
        target = DATA_DIR / name
        changed = not target.exists() or target.read_bytes() != source.read_bytes()
        shutil.copyfile(source, target)
        print(f"{'updated ' if changed else 'unchanged'} {target.relative_to(API_DIR)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
