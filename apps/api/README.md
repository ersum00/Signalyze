# signalyze-api

FastAPI service that computes and caches Review Profiles. It contains the Python port of the
signal engine (`signalyze_api/engine/`, mirroring `packages/signals` function-for-function and
held to the same fixtures) and never contacts Google. See the repository root README,
`docs/METHODOLOGY.md`, `docs/PRIVACY.md` and `docs/DEPLOY.md`.

## Run

```sh
uv sync
cp .env.example .env            # DATABASE_URL empty = in-memory cache
uv run uvicorn signalyze_api.main:app --port 8090 --reload
```

## Check

```sh
uv run pytest -q                 # includes fixture parity with packages/signals/fixtures
uv run ruff check . && uv run ruff format --check .
uv run mypy signalyze_api tests
```

`TEST_DATABASE_URL=postgresql://...` enables the PostgreSQL cache integration test (CI sets it).
After editing any file in `packages/signals/data` or `packages/signals/src/weights.json`, run
`uv run python scripts/sync_engine_data.py`; `tests/test_data_files_in_sync.py` fails otherwise.

## Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | empty | asyncpg DSN. Empty: in-memory cache (dev/tests). Tables are created on startup if missing. |
| `EXTENSION_IDS` | empty | Comma-separated Chrome extension ids allowed by CORS. |
| `PORT` | `8090` | Port for uvicorn. |
| `ANALYZE_RATE_LIMIT` | `60/hour` | Analyses per client IP (slowapi, in-memory per worker). |
| `MAX_BODY_BYTES` | `8388608` | Requests larger than this get 413. |
| `CACHE_TTL_DAYS` | `7` | How long a computed profile is kept. |
| `LLM_BASE_URL`, `LLM_API_KEY` | empty | Optional OpenAI-compatible endpoint; both empty = step disabled. |
| `LLM_MODEL` | `gpt-4o-mini` | Model name for the optional step. |

## Endpoints

| Method and path | Purpose |
| --- | --- |
| `GET /v1/health` | `{"status":"ok","version","engineVersion","cache":"postgres"\|"memory"}` |
| `POST /v1/analyze` | Body: `AnalysisRequest` (placeId, reviews[1..2000], ...). Returns `AnalysisResult`; `source` is `server` when computed now, `server-cache` when served from the 7-day cache (a request carrying more reviews than the cached profile recomputes). Rate limited. |
| `GET /v1/place/{place_id}` | Cached `AnalysisResult` (`source: server-cache`) or 404. |

Error bodies are always `{"error": <slug>, "message": <text>}`: `invalid_request` (422, with a
`details` list of `loc`/`msg`), `payload_too_large` (413), `rate_limited` (429), `not_found` (404).
`Review` objects reject unknown fields, so reviewer-identifying data is refused with 422.

## What is stored and logged

Only the computed profile JSON per place (7 days) and two daily counters. No review text,
reviewer hashes or IP addresses are stored. The access log (stdout, logger `signalyze.access`)
records one line per request with the client address anonymised (IPv4 last octet zeroed, IPv6
truncated to three hextets) and no query string.

## Outbound traffic

The only outbound HTTP client is built by `signalyze_api.egress.build_client`; it accepts
requests to the host of `LLM_BASE_URL` and refuses every other host before sending. When the
optional step is enabled and `text_similarity` is already unusual, at most 30 review texts (no
reviewer data) are sent and a single number, `llmHomogeneity`, is added to that signal's details.
It never changes the score.
