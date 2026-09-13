"""Guarantee: the backend never talks to Google. Enforced two ways:

1. Static: no source file in the package mentions Google hostnames.
2. Runtime: every outbound HTTP client is built by `signalyze_api.egress.build_client`,
   whose request hook refuses those hosts (covered in Phase 4 tests).
"""

from __future__ import annotations

import re
from pathlib import Path

PACKAGE_DIR = Path(__file__).resolve().parents[1] / "signalyze_api"
BLOCKED = re.compile(r"(google\.[a-z]|gstatic\.|googleapis\.|googleusercontent\.)", re.IGNORECASE)


def test_no_google_hostnames_in_source() -> None:
    offenders: list[str] = []
    for path in PACKAGE_DIR.rglob("*.py"):
        text = path.read_text(encoding="utf-8")
        for lineno, line in enumerate(text.splitlines(), start=1):
            if BLOCKED.search(line):
                offenders.append(f"{path.relative_to(PACKAGE_DIR.parent)}:{lineno}: {line.strip()}")
    assert offenders == [], "Google hostnames must never appear in the API:\n" + "\n".join(
        offenders
    )
