# Plain-language results, full-history scope and time window — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the side panel readable for a lay user (score reading, contributors, plain signal sentences with typical ranges), let an analysis cover every review Google shows (ceiling 2000) and let the user restrict it to a recent period, with a live acceptance script against real Google Maps pages.

**Architecture:** Scope (`sampleLimit`, `window`) is chosen on the Home view, stored in settings and passed through the message protocol to the content script, which switches Google's sort to Newest for windowed runs and stops early. The side panel filters by date, runs windowed analyses with the bundled engine only, and caches them under a window-suffixed key. Plain-language copy lives in the i18n JSON files; the numbers it quotes come from the engine's `details` and from the shared thresholds file so wording can never drift from the maths. The engine gains a deterministic 600-text sampling cap for the only quadratic signal, mirrored in the Python port and locked by a new fixture.

**Tech Stack:** pnpm workspaces, TypeScript, WXT + React (extension), vitest, zod, FastAPI + pydantic (API, `uv`), Playwright (live check), Astro (landing).

**Spec:** `docs/superpowers/specs/2026-09-14-plain-language-scope-window-design.md`

## Global Constraints

- Every user-facing string in en/tr/de/es must pass `pnpm check:forbidden-words` and the i18n key-parity test (`apps/extension/src/i18n/i18n.test.ts`): identical key sets, identical `{placeholders}`.
- Language policy: measurement sentences only. No verdicts about the business or reviewers ("the reader draws the conclusion").
- DOM access only inside `apps/extension/src/adapters/google-maps/` (ESLint rule + `scripts/check-dom-isolation.mjs`).
- Engine change = bump `packages/signals/src/weights.json` and `packages/signals/data/thresholds.json` to `"1.2.0"`, regenerate fixtures (`pnpm --filter @signalyze/signals fixtures:generate`), sync Python data copies (`cd apps/api && uv run python scripts/sync_engine_data.py`), keep TS and Python function-for-function identical.
- Limits: `DEFAULT_REVIEW_LIMIT = 200`, `SAMPLE_LIMITS = [200, 500, 1000]`, `ALL_REVIEWS_CEILING = 2000`, `MAX_REVIEWS_PER_REQUEST = 2000`, API `max_body_bytes = 8 MiB`, text-similarity `maxEligible = 600`, scroll pace unchanged (600 ms).
- Windows: `'all' | 'thisYear' | 'last12m' | 'last6m' | 'last3m' | 'thisMonth'`, computed in UTC.
- Commit after every task with the attribution line `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Checks before the final commit: `pnpm lint && pnpm typecheck && pnpm test && pnpm check:forbidden-words && pnpm check:dom-isolation && pnpm --filter @signalyze/landing build && pnpm --filter @signalyze/extension build && pnpm build:zip` and `cd apps/api && uv run ruff check . && uv run ruff format --check . && uv run mypy signalyze_api tests && uv run pytest -q`.

---

## File map

| File                                                                                                                                                                                                                                              | Responsibility                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `packages/shared/src/constants.ts`                                                                                                                                                                                                                | Limits, `SampleLimit`, `AnalysisWindow` types and lists        |
| `packages/shared/src/window.ts` (new)                                                                                                                                                                                                             | `windowStart`, `resolveLimit`, type guards                     |
| `packages/shared/src/__tests__/window.test.ts` (new)                                                                                                                                                                                              | Tests for the above                                            |
| `packages/signals/data/thresholds.json`, `src/weights.json`                                                                                                                                                                                       | `maxEligible`, version 1.2.0                                   |
| `packages/signals/src/signals/text-similarity.ts`                                                                                                                                                                                                 | Deterministic sampling                                         |
| `packages/signals/src/testing/synthetic.ts`                                                                                                                                                                                                       | `largeDataset`                                                 |
| `packages/signals/scripts/generate-fixtures.ts`                                                                                                                                                                                                   | `large` case                                                   |
| `packages/signals/src/index.ts`                                                                                                                                                                                                                   | export `THRESHOLDS`                                            |
| `apps/api/signalyze_api/engine/signals/text_similarity.py`, `data_files.py`, `models.py`, `config.py`, `main.py`                                                                                                                                  | Python mirror, limits                                          |
| `apps/api/tests/test_performance.py`, `test_engine_fixtures.py`                                                                                                                                                                                   | 2000-review bound, `sampled` int key                           |
| `apps/extension/src/adapters/google-maps/selectors.ts`                                                                                                                                                                                            | `sortButton`, `sortMenuNewest` rules + dictionaries            |
| `apps/extension/src/adapters/google-maps/panel.ts`                                                                                                                                                                                                | `selectNewestSort`, `minDate` early stop, `sortedByNewest`     |
| `apps/extension/src/lib/messages.ts`                                                                                                                                                                                                              | `minDate` on COLLECT_REVIEWS, `sortedByNewest` on the response |
| `apps/extension/src/entrypoints/content.ts`                                                                                                                                                                                                       | Pass-through, ceiling                                          |
| `apps/extension/src/lib/storage.ts`                                                                                                                                                                                                               | `sampleLimit`, `window` settings; window-suffixed cache keys   |
| `apps/extension/src/lib/scope.ts` (new)                                                                                                                                                                                                           | `AnalysisScope`, `filterByWindow`                              |
| `apps/extension/src/lib/reading.ts` (new)                                                                                                                                                                                                         | Score bands, contributions                                     |
| `apps/extension/src/lib/explain.ts`                                                                                                                                                                                                               | `signalPlain`, `signalBaseline`, `signalLookAt`                |
| `apps/extension/src/entrypoints/sidepanel/hooks/useAnalysis.ts`                                                                                                                                                                                   | Scope-aware state machine                                      |
| `apps/extension/src/entrypoints/sidepanel/components/{Home,Collecting,ResultView,SignalList,MainView}.tsx`                                                                                                                                        | UI                                                             |
| `apps/extension/src/i18n/{en,tr,de,es}.json`                                                                                                                                                                                                      | Copy                                                           |
| `apps/extension/scripts/live-check.mjs` (new)                                                                                                                                                                                                     | Live acceptance script                                         |
| Docs: `docs/PRIVACY*.md`, `docs/METHODOLOGY*.md`, `docs/LEGAL_NOTES.md`, `docs/STORE_LISTING.md`, `apps/extension/store/listing.md`, `apps/landing/src/i18n/*.ts` (mock text), `README.md`, `CHANGELOG.md`, `apps/extension/package.json` (0.2.0) | Text and versions                                              |

---

### Task 1: Shared scope constants and window arithmetic

**Files:**

- Modify: `packages/shared/src/constants.ts`
- Create: `packages/shared/src/window.ts`
- Modify: `packages/shared/src/index.ts` (re-export)
- Test: `packages/shared/src/__tests__/window.test.ts`

**Interfaces:**

- Produces:
  ```ts
  export const SAMPLE_LIMITS = [200, 500, 1000] as const;
  export type SampleLimit = (typeof SAMPLE_LIMITS)[number] | 'all';
  export const ALL_REVIEWS_CEILING = 2000;
  export const MAX_REVIEWS_PER_REQUEST = 2000;
  export const ANALYSIS_WINDOWS = [
    'all',
    'thisYear',
    'last12m',
    'last6m',
    'last3m',
    'thisMonth',
  ] as const;
  export type AnalysisWindow = (typeof ANALYSIS_WINDOWS)[number];
  export function isSampleLimit(value: unknown): value is SampleLimit;
  export function isAnalysisWindow(value: unknown): value is AnalysisWindow;
  export function resolveLimit(limit: SampleLimit): number; // 'all' -> ALL_REVIEWS_CEILING
  export function windowStart(window: AnalysisWindow, now: Date): string | null; // "YYYY-MM-DD" UTC or null for 'all'
  ```
- `EXTENDED_REVIEW_LIMIT` is deleted; every import of it is replaced in later tasks.

- [ ] **Step 1: Write the failing test** `packages/shared/src/__tests__/window.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { ALL_REVIEWS_CEILING } from '../constants';
import { isAnalysisWindow, isSampleLimit, resolveLimit, windowStart } from '../window';

const NOW = new Date('2026-09-14T13:45:00Z');

describe('windowStart', () => {
  it('returns null for all time', () => {
    expect(windowStart('all', NOW)).toBeNull();
  });
  it('computes calendar windows in UTC', () => {
    expect(windowStart('thisYear', NOW)).toBe('2026-01-01');
    expect(windowStart('thisMonth', NOW)).toBe('2026-09-01');
    expect(windowStart('last12m', NOW)).toBe('2025-09-14');
    expect(windowStart('last6m', NOW)).toBe('2026-03-14');
    expect(windowStart('last3m', NOW)).toBe('2026-06-14');
  });
  it('rolls month arithmetic over year and month-length boundaries', () => {
    expect(windowStart('last3m', new Date('2026-01-31T00:00:00Z'))).toBe('2025-10-31');
    expect(windowStart('last6m', new Date('2026-08-31T00:00:00Z'))).toBe('2026-03-03');
  });
});

describe('guards and limits', () => {
  it('accepts only the listed values', () => {
    expect(isSampleLimit(200)).toBe(true);
    expect(isSampleLimit('all')).toBe(true);
    expect(isSampleLimit(300)).toBe(false);
    expect(isAnalysisWindow('last3m')).toBe(true);
    expect(isAnalysisWindow('yesterday')).toBe(false);
  });
  it('resolves "all" to the ceiling', () => {
    expect(resolveLimit(500)).toBe(500);
    expect(resolveLimit('all')).toBe(ALL_REVIEWS_CEILING);
  });
});
```

- [ ] **Step 2: Run it** — `pnpm --filter @signalyze/shared test` → FAIL (module `../window` not found).

- [ ] **Step 3: Implement** — in `constants.ts` replace the `EXTENDED_REVIEW_LIMIT` / `MAX_REVIEWS_PER_REQUEST` block with:

```ts
/** Review-count choices offered on the Home view; 'all' loads until Google shows no more. */
export const SAMPLE_LIMITS = [200, 500, 1000] as const;
export type SampleLimit = (typeof SAMPLE_LIMITS)[number] | 'all';
/** Hard ceiling for 'all' (time budget, request size, browser memory). */
export const ALL_REVIEWS_CEILING = 2000;
/** Hard cap accepted by the API (also enforced by the 8 MB body limit). */
export const MAX_REVIEWS_PER_REQUEST = ALL_REVIEWS_CEILING;
/** Periods the analysis can be restricted to. Start days are computed in UTC. */
export const ANALYSIS_WINDOWS = [
  'all',
  'thisYear',
  'last12m',
  'last6m',
  'last3m',
  'thisMonth',
] as const;
export type AnalysisWindow = (typeof ANALYSIS_WINDOWS)[number];
```

`window.ts`:

```ts
import {
  ALL_REVIEWS_CEILING,
  ANALYSIS_WINDOWS,
  SAMPLE_LIMITS,
  type AnalysisWindow,
  type SampleLimit,
} from './constants';

export function isSampleLimit(value: unknown): value is SampleLimit {
  return value === 'all' || (SAMPLE_LIMITS as readonly unknown[]).includes(value);
}
export function isAnalysisWindow(value: unknown): value is AnalysisWindow {
  return (ANALYSIS_WINDOWS as readonly unknown[]).includes(value);
}
export function resolveLimit(limit: SampleLimit): number {
  return limit === 'all' ? ALL_REVIEWS_CEILING : limit;
}
function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
/** First calendar day (UTC) of the window, or null for all time. Month subtraction keeps the day of month and lets Date.UTC normalise overflow. */
export function windowStart(window: AnalysisWindow, now: Date): string | null {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  switch (window) {
    case 'all':
      return null;
    case 'thisYear':
      return isoDay(Date.UTC(y, 0, 1));
    case 'thisMonth':
      return isoDay(Date.UTC(y, m, 1));
    case 'last12m':
      return isoDay(Date.UTC(y, m - 12, d));
    case 'last6m':
      return isoDay(Date.UTC(y, m - 6, d));
    case 'last3m':
      return isoDay(Date.UTC(y, m - 3, d));
  }
}
```

Add `export * from './window';` to `packages/shared/src/index.ts`.

- [ ] **Step 4: Run** `pnpm --filter @signalyze/shared test && pnpm --filter @signalyze/shared typecheck` → PASS. (Other workspaces fail to typecheck until Tasks 5–8 replace `EXTENDED_REVIEW_LIMIT`; that is expected.)

- [ ] **Step 5: Commit** `git add packages/shared && git commit -m "shared: scope limits and analysis windows"`

---

### Task 2: Engine sampling cap for text similarity (TypeScript), version 1.2.0, fixtures

**Files:**

- Modify: `packages/signals/data/thresholds.json` (`"version": "1.2.0"`, `text_similarity.maxEligible: 600`)
- Modify: `packages/signals/src/weights.json` (`"version": "1.2.0"`)
- Modify: `packages/signals/src/signals/text-similarity.ts`
- Modify: `packages/signals/src/testing/synthetic.ts` (add `largeDataset`, register in `DATASETS`)
- Modify: `packages/signals/scripts/generate-fixtures.ts` (add `{ name: 'large', count: 1000, seed: 109 }`)
- Modify: `packages/signals/src/index.ts` (export `THRESHOLDS`)
- Test: `packages/signals/src/__tests__/signals.test.ts`

**Interfaces:**

- Produces: `details.sampled: number` on `text_similarity` (always present; equals `eligible` when no sampling); `export const THRESHOLDS` (the parsed thresholds JSON) from `@signalyze/signals`.

- [ ] **Step 1: Failing test** (append to `signals.test.ts`):

```ts
describe('text_similarity sampling', () => {
  it('compares every pair up to 600 eligible texts and samples evenly above', () => {
    const small = signal(normalDataset({ count: 300, seed: 21 }), 'text_similarity');
    expect(small.details.sampled).toBe(small.details.eligible);
    const big = signal(DATASETS.large({ count: 1000, seed: 109 }), 'text_similarity');
    expect(big.details.eligible).toBeGreaterThan(600);
    expect(big.details.sampled).toBe(600);
    expect(big.details.pairs).toBe((600 * 599) / 2);
  });
  it('picks the same texts regardless of runtime: index floor(i*n/600)', () => {
    const reviews = DATASETS.large({ count: 1000, seed: 109 });
    const a = signal(reviews, 'text_similarity');
    const b = signal([...reviews], 'text_similarity');
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: Run** `pnpm --filter @signalyze/signals test -- signals` → FAIL (`DATASETS.large` undefined).

- [ ] **Step 3: Implement.** `synthetic.ts`: `export function largeDataset({ count, seed }: DatasetOptions): Review[] { return normalDataset({ count: Math.max(count, 700), seed }); }` and add `large: largeDataset` to `DATASETS`. `text-similarity.ts` after the eligibility check:

```ts
const n = eligible.length;
const cap = T.maxEligible;
const sampled =
  n > cap ? Array.from({ length: cap }, (_, i) => eligible[Math.floor((i * n) / cap)]!) : eligible;
const grams = sampled.map((r) => ngramsOf(r, T.ngramSize));
// ... unchanged loop over grams ...
details: { meanJaccard, highPairShare, highPairs, pairs, maxPair, eligible: n, sampled: sampled.length }
```

Update the doc comment: "Above `maxEligible` texts, an evenly spaced subset (index floor(i·n/cap), input order) is compared so the cost stays bounded; both runtimes pick the same indices." `index.ts`: `import thresholds from '../data/thresholds.json'; export const THRESHOLDS = thresholds;`.

- [ ] **Step 4: Regenerate fixtures and run** `pnpm --filter @signalyze/signals fixtures:generate && pnpm --filter @signalyze/signals test && pnpm --filter @signalyze/signals typecheck` → PASS; `git diff --stat packages/signals/fixtures` shows every fixture touched (engineVersion + `sampled`) and `large.json` added.

- [ ] **Step 5: Commit** `git add packages/signals && git commit -m "signals 1.2.0: bounded text-similarity sampling, large fixture"`

---

### Task 3: Python port mirror and API limits

**Files:**

- Modify: `apps/api/signalyze_api/engine/data_files.py` (`maxEligible: int` on `TextSimilarityThresholds`)
- Modify: `apps/api/signalyze_api/engine/signals/text_similarity.py`
- Modify: `apps/api/signalyze_api/models.py` (`MAX_REVIEWS_PER_REQUEST = 2000`)
- Modify: `apps/api/signalyze_api/config.py` (`max_body_bytes: int = 8 * 1024 * 1024`)
- Modify: `apps/api/signalyze_api/main.py` (message "Request body exceeds 8 MB.")
- Modify: `apps/api/README.md` (limits table), `deploy/caddy/signalyze.caddy` + `deploy/nginx/signalyze.conf` if they cap the body at 2 MB (grep `2m|2M|body`)
- Modify: `apps/api/tests/test_engine_fixtures.py` (add `"sampled"` to `INT_KEYS`), `apps/api/tests/test_performance.py`
- Run: `uv run python scripts/sync_engine_data.py`

- [ ] **Step 1: Failing tests.** Replace `test_performance.py` body:

```python
"""Bound for the text-similarity signal at the request cap: 2000 reviews, 600 sampled texts."""
def test_2000_reviews_with_200_char_texts_complete_quickly() -> None:
    reviews = [Review.model_validate(r) for r in synthesize_reviews(MAX_REVIEWS_PER_REQUEST, seed=3, text_chars=200)]
    start = time.perf_counter()
    result = analyze(reviews, "0xperf:0xtest", "server", dt.datetime.now(dt.UTC))
    elapsed = time.perf_counter() - start
    assert result.status == "ok"
    text_similarity = next(s for s in result.signals if s.id == "text_similarity")
    assert text_similarity.details["eligible"] == 2000
    assert text_similarity.details["sampled"] == 600
    assert text_similarity.details["pairs"] == 600 * 599 // 2
    assert elapsed < 4.0, f"analyze took {elapsed:.2f}s"
```

- [ ] **Step 2: Run** `cd apps/api && uv run pytest -q tests/test_performance.py tests/test_engine_fixtures.py tests/test_data_files_in_sync.py` → FAIL (data out of sync, `sampled` missing, cap 500).

- [ ] **Step 3: Implement** `text_similarity.py`:

```python
n = len(eligible)
cap = T.maxEligible
sampled = [eligible[(i * n) // cap] for i in range(cap)] if n > cap else eligible
grams = [ngrams_of(r, T.ngramSize) for r in sampled]
... details={..., "eligible": n, "sampled": len(sampled)}
```

Then `uv run python scripts/sync_engine_data.py`, set limits, update the message and README.

- [ ] **Step 4: Run** `uv run ruff check . && uv run ruff format --check . && uv run mypy signalyze_api tests && uv run pytest -q` → PASS.

- [ ] **Step 5: Commit** `git add apps/api deploy && git commit -m "api: engine 1.2.0 mirror, 2000-review requests, 8 MB bodies"`

---

### Task 4: Adapter — switch to Newest sort, early stop for a window

**Files:**

- Modify: `apps/extension/src/adapters/google-maps/selectors.ts`
- Modify: `apps/extension/src/adapters/google-maps/panel.ts`
- Test: `apps/extension/src/adapters/google-maps/panel.test.ts`

**Interfaces:**

- Produces:

  ```ts
  export interface CollectOptions { limit: number; minDate?: string | null; ... }
  export interface CollectResult { reviews: RawReview[]; status: CollectStatus; sortedByNewest: boolean }
  export async function selectNewestSort(doc: Document, wait: () => Promise<void>, aborted: () => boolean): Promise<boolean>
  ```

  New rules `sortButton` and `sortMenuNewest` (document scope, `required: false`).

- [ ] **Step 1: Failing tests** (append to `panel.test.ts`; the page builder gains a sort button + menu):

```ts
function sortHtml(
  labels = {
    button: 'Sort reviews',
    items: ['Most relevant', 'Newest', 'Highest rating', 'Lowest rating'],
  },
): string {
  return `<button aria-haspopup="true" data-value="Sort" aria-label="${labels.button}">${labels.button}</button>
    <div role="menu" hidden>${labels.items.map((item, i) => `<div role="menuitemradio" data-index="${i}" aria-checked="${i === 0}">${item}</div>`).join('')}</div>`;
}
```

Insert `${options.sort ? sortHtml(options.sort) : ''}` between the tablist and the scroll container in `pageHtml` (extend its options type with `sort?: Parameters<typeof sortHtml>[0] | true`). Tests:

```ts
describe('selectNewestSort', () => {
  it('opens the sort menu and clicks the Newest item by label', async () => {
    const doc = load(pageHtml(THREE, { sort: true }));
    const menu = doc.querySelector('[role="menu"]')!;
    doc.querySelector('button[aria-haspopup]')!.addEventListener('click', () => {
      menu.removeAttribute('hidden');
    });
    const clicked: string[] = [];
    for (const item of Array.from(doc.querySelectorAll('[role="menuitemradio"]')))
      item.addEventListener('click', () => clicked.push(item.textContent ?? ''));
    expect(
      await selectNewestSort(
        doc,
        async () => {},
        () => false,
      ),
    ).toBe(true);
    expect(clicked).toEqual(['Newest']);
  });
  it('falls back to the second menu item in an unknown UI language', async () => {
    const doc = load(
      pageHtml(THREE, {
        sort: {
          button: 'Rendezés',
          items: ['Legrelevánsabb', 'Legújabb', 'Legjobb', 'Legrosszabb'],
        },
      }),
    );
    const clicked: string[] = [];
    for (const item of Array.from(doc.querySelectorAll('[role="menuitemradio"]')))
      item.addEventListener('click', () => clicked.push(item.textContent ?? ''));
    expect(
      await selectNewestSort(
        doc,
        async () => {},
        () => false,
      ),
    ).toBe(true);
    expect(clicked).toEqual(['Legújabb']);
  });
  it('reports false when the page has no sort control', async () => {
    const doc = load(pageHtml(THREE));
    expect(
      await selectNewestSort(
        doc,
        async () => {},
        () => false,
      ),
    ).toBe(false);
  });
});

describe('collectReviews with a window', () => {
  it('stops after two rounds that only added reviews older than minDate', async () => {
    // r1: 2 weeks ago (2026-08-30), r2: a month ago (2026-08-14), r3: 3 years ago
    const doc = load(pageHtml(THREE, { sort: true }));
    let round = 0;
    const older = (i: number): MiniReview => ({
      id: `old${i}`,
      reviewer: 100 + i,
      stars: 4,
      when: '4 years ago',
    });
    const panel = doc.querySelector('[tabindex="-1"] > div')!;
    const result = await collectReviews(doc, {
      limit: 2000,
      minDate: '2026-08-01',
      now: NOW,
      sleep: async () => {
        round += 1;
        panel.insertAdjacentHTML('beforeend', reviewHtml(older(round)));
      },
    });
    expect(result.sortedByNewest).toBe(true);
    expect(result.status).toBe('complete');
    expect(result.reviews.length).toBeLessThan(8);
  });
  it('keeps collecting when the sort switch failed', async () => {
    const doc = load(pageHtml(THREE));
    const result = await collectReviews(doc, {
      limit: 3,
      minDate: '2026-08-01',
      now: NOW,
      sleep: async () => {},
    });
    expect(result.sortedByNewest).toBe(false);
    expect(result.status).toBe('complete');
  });
});
```

- [ ] **Step 2: Run** `pnpm --filter @signalyze/extension test -- panel` → FAIL (`selectNewestSort` not exported).

- [ ] **Step 3: Implement.** `selectors.ts`: add dictionaries `SORT_BUTTON_LABELS` and `NEWEST_LABELS` (30 UI languages, same shape as `REVIEWS_TAB_LABELS`), compiled regexes `SORT_LABEL_REGEX`, `NEWEST_LABEL_REGEX`, and two rules:

```ts
{
  name: 'sortButton', scope: 'document', required: false,
  reliesOn: 'button[aria-haspopup] in the main panel: data-value="Sort", or a label with a "sort" word in a known UI language, else the last such button before the first review container',
  find: (root) => {
    const main = mainPanelOf(root);
    const first = reviewContainers(main)[0] ?? null;
    const candidates = all(main, 'button[aria-haspopup]').filter((el) => el.closest('[data-review-id]') === null);
    const byValue = candidates.filter((el) => el.getAttribute('data-value') === 'Sort');
    if (byValue.length > 0) return byValue;
    const byLabel = candidates.filter((el) => SORT_LABEL_REGEX.test(foldText(`${el.getAttribute('aria-label') ?? ''} ${el.textContent ?? ''}`)));
    if (byLabel.length > 0) return byLabel;
    const before = candidates.filter((el) => first === null || Boolean(el.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING));
    return before.length > 0 ? [before[before.length - 1]!] : [];
  },
},
{
  name: 'sortMenuNewest', scope: 'document', required: false,
  reliesOn: 'inside [role="menu"], the [role="menuitemradio"] labelled "Newest" in a known UI language; else the second item (Google\'s fixed order: most relevant, newest, highest, lowest)',
  find: (root) => {
    const items = all(root, '[role="menu"] [role="menuitemradio"], [role="menu"] [role="menuitem"]');
    const byLabel = items.filter((el) => NEWEST_LABEL_REGEX.test(foldText(el.textContent ?? '')));
    if (byLabel.length > 0) return [byLabel[0]!];
    return items.length >= 2 ? [items[1]!] : [];
  },
},
```

`panel.ts`:

```ts
export async function selectNewestSort(doc, wait, aborted): Promise<boolean> {
  const button = rule('sortButton').find(doc)[0];
  if (!(button instanceof HTMLElement)) return false;
  button.click();
  let item: Element | undefined;
  for (let i = 0; i < PROBE_WAIT_INTERVALS && item === undefined; i += 1) {
    item = rule('sortMenuNewest').find(doc)[0];
    if (item === undefined) {
      if (aborted()) return false;
      await wait();
    }
  }
  if (!(item instanceof HTMLElement)) return false;
  item.click();
  await wait();
  return true;
}
```

In `collectReviews`, after the render-wait loop and before `findScrollPanel`: `const sortedByNewest = options.minDate ? await selectNewestSort(doc, wait, aborted) : false;` (bail with `finish('aborted')` if aborted). `finish` includes `sortedByNewest`. In the loop, count `added` (ids new this round) and `addedOld` (added with `review.date < minDate`); `oldRounds = added > 0 && addedOld === added ? oldRounds + 1 : 0`; `if (sortedByNewest && minDate && oldRounds >= STALE_SCROLLS_BEFORE_EXHAUSTED) return finish('complete');`. Update `CollectOptions`/`CollectResult` docs. `checkLayout` is unaffected (rules are not required).

- [ ] **Step 4: Run** `pnpm --filter @signalyze/extension test -- adapters` → PASS (existing fixture tests still pass since the new rules are optional).

- [ ] **Step 5: Commit** `git add apps/extension/src/adapters && git commit -m "adapter: newest sort switch and window early stop"`

---

### Task 5: Message protocol, content script, settings and cache keys

**Files:**

- Modify: `apps/extension/src/lib/messages.ts`, `apps/extension/src/entrypoints/content.ts`, `apps/extension/src/lib/storage.ts`
- Create: `apps/extension/src/lib/scope.ts`
- Tests: `apps/extension/src/lib/messages.test.ts`, `apps/extension/src/lib/storage.test.ts`, new `apps/extension/src/lib/scope.test.ts`

**Interfaces:**

- Produces:

  ```ts
  // messages.ts
  export interface CollectReviewsMessage { type: 'COLLECT_REVIEWS'; limit: number; minDate: string | null }
  export interface CollectReviewsResponse { status; request; collected; dropped; sortedByNewest: boolean }
  // storage.ts
  export interface Settings { ...; sampleLimit: SampleLimit; window: AnalysisWindow }
  export function cacheKey(placeId: string, window: AnalysisWindow): string // placeId or `${placeId}|${window}`
  export function getCachedResult(placeId, window: AnalysisWindow = 'all', now?): Promise<CachedResult | null>
  export function setCachedResult(placeId, result, window: AnalysisWindow = 'all', now?): Promise<void>
  // scope.ts
  export interface AnalysisScope { limit: SampleLimit; window: AnalysisWindow }
  export const DEFAULT_SCOPE: AnalysisScope = { limit: 200, window: 'all' };
  export function scopeOf(settings: Pick<Settings, 'sampleLimit' | 'window'>): AnalysisScope;
  export function filterByWindow<T extends { date: string }>(reviews: readonly T[], start: string | null): T[];
  ```

- [ ] **Step 1: Failing tests.** `scope.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { filterByWindow, scopeOf } from './scope';
describe('scope', () => {
  it('keeps reviews on or after the start day', () => {
    const reviews = [{ date: '2026-07-31' }, { date: '2026-08-01' }, { date: '2026-09-10' }];
    expect(filterByWindow(reviews, '2026-08-01').map((r) => r.date)).toEqual([
      '2026-08-01',
      '2026-09-10',
    ]);
    expect(filterByWindow(reviews, null)).toHaveLength(3);
  });
  it('reads the scope from settings', () => {
    expect(scopeOf({ sampleLimit: 'all', window: 'last3m' })).toEqual({
      limit: 'all',
      window: 'last3m',
    });
  });
});
```

`storage.test.ts` additions: default settings contain `sampleLimit: 200, window: 'all'`; `sanitize` drops `sampleLimit: 300` and `window: 'x'` back to defaults; `setCachedResult('p', r, 'last3m')` then `getCachedResult('p')` is null and `getCachedResult('p', 'last3m')` returns it. `messages.test.ts`: `isTabMessage({type:'COLLECT_REVIEWS', limit: 200, minDate: null})` true, with `minDate: '2026-01-01'` true, with `minDate: 5` false.

- [ ] **Step 2: Run** the three test files → FAIL.

- [ ] **Step 3: Implement.** `messages.ts`: add `minDate` to the message and guard (`record.minDate === null || typeof record.minDate === 'string'`), `sortedByNewest` to the response. `content.ts`: replace `EXTENDED_REVIEW_LIMIT` by `ALL_REVIEWS_CEILING`; `collect(limit, minDate)` passes `minDate` to `collectReviews` and returns `sortedByNewest: result.sortedByNewest` (false in the early returns). `storage.ts`: extend `Settings`, `DEFAULT_SETTINGS`, `sanitizeSettings` using `isSampleLimit`/`isAnalysisWindow`; add `cacheKey`; thread `window` through get/set (the badge and `showCached` keep calling with the default). `scope.ts` as in the interface block.

- [ ] **Step 4: Run** `pnpm --filter @signalyze/extension test -- lib` → PASS.

- [ ] **Step 5: Commit** `git add apps/extension/src/lib apps/extension/src/entrypoints/content.ts && git commit -m "extension: scope settings, window cache keys, minDate on collect"`

---

### Task 6: Score reading and contributions

**Files:**

- Create: `apps/extension/src/lib/reading.ts`
- Test: `apps/extension/src/lib/reading.test.ts`

**Interfaces:**

```ts
export type ScoreBand = 'typical' | 'some' | 'many' | 'most';
export function scoreBand(score: number): ScoreBand; // <20 typical, <40 some, <60 many, else most
export interface Contribution {
  id: SignalId;
  points: number;
}
/** Points each available signal adds: round(100 * w * u / Σw_available); sorted descending, zero points dropped. */
export function contributions(signals: readonly SignalResult[]): Contribution[];
export const MAX_SIGNAL_POINTS: number; // round(100 * max weight) = 16
```

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from 'vitest';
import { contributions, MAX_SIGNAL_POINTS, scoreBand } from './reading';
import { signalResult } from './test-helpers';
describe('scoreBand', () => {
  it('maps the four bands', () => {
    expect(scoreBand(0)).toBe('typical');
    expect(scoreBand(19)).toBe('typical');
    expect(scoreBand(20)).toBe('some');
    expect(scoreBand(40)).toBe('many');
    expect(scoreBand(60)).toBe('most');
    expect(scoreBand(100)).toBe('most');
  });
});
describe('contributions', () => {
  it('splits the score by weight share and drops zero contributors', () => {
    const signals = [
      signalResult({ id: 'burst_ratio', unusualness: 0.5 }), // 0.16 weight
      signalResult({ id: 'text_similarity', unusualness: 0 }),
      signalResult({ id: 'rating_polarity', unusualness: 1, available: false }),
    ];
    // available weights: 0.16 + 0.16 = 0.32 -> burst points = round(100 * 0.16 * 0.5 / 0.32) = 25
    expect(contributions(signals)).toEqual([{ id: 'burst_ratio', points: 25 }]);
  });
  it('exposes the largest single-signal share', () => {
    expect(MAX_SIGNAL_POINTS).toBe(16);
  });
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** using `WEIGHTS` from `@signalyze/signals` and `roundHalfUp` semantics (`Math.floor(x + 0.5)`). **Step 4: Run** → PASS. **Step 5: Commit** `feat(extension): score bands and signal contributions`.

---

### Task 7: Plain, baseline and look-at sentences (`explain.ts`) + i18n copy in four languages

**Files:**

- Modify: `apps/extension/src/lib/explain.ts`, `apps/extension/src/i18n/{en,tr,de,es}.json`
- Test: `apps/extension/src/lib/explain.test.ts`, `apps/extension/src/i18n/i18n.test.ts` (existing parity tests)

**Interfaces:**

```ts
export function signalPlain(signal: SignalResult, locale: Locale): string; // signal.<id>.plain (+ signal.text_similarity.sampledNote when sampled < eligible)
export function signalBaseline(id: SignalId, locale: Locale): string; // signal.<id>.baseline with THRESHOLDS-derived percent params
export function signalLookAt(id: SignalId, locale: Locale): string; // signal.<id>.lookAt
export function baselineParams(id: SignalId): MessageParams; // exported for tests
```

Baseline parameters (all whole percentages from `THRESHOLDS`): burst `{low: 5, high: 65}`; rating_polarity `{low: 82, high: 96}`; single_review_accounts `{low: 30, high: 75}`; no_photo_short_text `{low: 60, high: 95}`; text_similarity `{meanLow: 18, meanHigh: 45, pairLow: 2, pairHigh: 15}`; template_phrases `{low: 15, high: 50}`; rating_text_mismatch `{low: 10, high: 35}`; date_entropy `{typicalAbove: 75, extremeBelow: 35}` (= 100·(1−low), 100·(1−high)); local_guide_ratio `{typicalAtLeast: 20}`; owner_response_pattern `{low: 60, high: 95}`.
Extra plain-sentence parameters: burst `years` (lifespanDays/365.25, 1 decimal), `expectedPercent` (expectedShare·100, 1 decimal), `excessPercent`; rating_polarity `middle` (= 100 − percent); text_similarity `meanPercent`, `sampled`, `eligible`.

English copy (reference; tr/de/es are faithful translations, same placeholders):

```
signals.legend            "0% = typical · 100% = extreme"
signals.distance          "Distance from typical"
signals.lookAt            "What to look at"
signal.burst_ratio.plain  "{peakPercent}% of the reviews ({peakCount}) were written in the {windowDays} days from {start} to {end}. Spread evenly over {years} years, that window would hold about {expectedPercent}%; the excess is {excessPercent}%."
signal.burst_ratio.baseline "Typical businesses stay below {low}% excess; {high}% and above is the extreme end."
signal.burst_ratio.lookAt "Open the reviews from those dates: an opening, a campaign or a news story may explain the peak."
signal.rating_polarity.plain "{percent}% of the ratings are 5 or 1 stars ({share5}% five, {share1}% one); 2, 3 and 4 stars make up {middle}%."
signal.rating_polarity.baseline "Google ratings lean towards 5 stars anyway: typical businesses stay below {low}%; {high}% and above is the extreme end."
signal.rating_polarity.lookAt "Middle ratings (2 to 4 stars) are usually the most detailed; read those first if there are any."
signal.single_review_accounts.plain "Of the {known} reviewers whose review count is shown, {singles} ({percent}%) have written no other review."
signal.single_review_accounts.baseline "Typical businesses stay below {low}%; {high}% and above is the extreme end."
signal.single_review_accounts.lookAt "Clicking a reviewer's name shows their other reviews; reviewers with a longer history give you more to compare."
signal.no_photo_short_text.plain "{percent}% of the reviews ({count}) have no photo and fewer than {chars} characters of text."
signal.no_photo_short_text.baseline "Rating-only reviews are common: typical businesses stay below {low}%; {high}% and above is the extreme end."
signal.no_photo_short_text.lookAt "Reviews with photos and longer texts carry concrete detail; filter by photos to read those first."
signal.text_similarity.plain "The texts overlap by {meanPercent}% on average; {highPairs} of {pairs} text pairs ({pairPercent}%) are nearly identical."
signal.text_similarity.sampledNote "Computed on {sampled} of {eligible} texts, evenly spaced."
signal.text_similarity.baseline "Independently written texts about the same place typically overlap below {meanLow}% ({meanHigh}% and above is extreme); nearly identical pairs stay below {pairLow}% ({pairHigh}% and above is extreme)."
signal.text_similarity.lookAt "If several reviews use almost the same sentences, read them side by side."
signal.template_phrases.plain "{phraseBased} of the {withText} reviews with text ({percent}%) consist mostly of stock phrases; most frequent: {top}."
signal.template_phrases.baseline "Typical businesses stay below {low}%; {high}% and above is the extreme end."
signal.template_phrases.lookAt "Reviews with specifics (what was ordered, who helped, how long it took) tell you more than stock phrases."
signal.rating_text_mismatch.plain "In {mismatches} of the {scored} reviews the tone lexicon could score ({percent}%), the text's tone disagrees with the stars (for example a negative text with 5 stars)."
signal.rating_text_mismatch.baseline "Because the lexicon ignores irony and negation, up to {low}% is typical; {high}% and above is the extreme end."
signal.rating_text_mismatch.lookAt "Read the text together with the stars; the star count alone can mislead."
signal.date_entropy.plain "Over {months} months the reviews reach {percent}% of a perfectly even spread; the busiest month is {busiest} with {busiestPercent}% of them."
signal.date_entropy.baseline "Typical businesses stay above {typicalAbove}%; {extremeBelow}% and below is the extreme end. Seasonal businesses sit a little lower."
signal.date_entropy.lookAt "Check the monthly chart: do the busy months line up with a season or an event?"
signal.local_guide_ratio.plain "{percent}% of the reviews ({established}) come from Local Guides at level {level} or higher."
signal.local_guide_ratio.baseline "Established Local Guides are part of the mix at most places: {typicalAtLeast}% and above is typical; 0% is the extreme end."
signal.local_guide_ratio.lookAt "Local Guide profiles are public; their other reviews are a useful comparison."
signal.owner_response_pattern.plain "Of the {responded} owner replies only {distinct} are different; {percent}% repeat another reply word for word."
signal.owner_response_pattern.baseline "Many businesses reuse one thank-you line: up to {low}% repetition is typical; {high}% and above is the extreme end."
signal.owner_response_pattern.lookAt "This signal describes how the page is managed, not the reviewers."
result.reading.typical    "The measured patterns look like typical businesses."
result.reading.some       "Some measurements differ from typical businesses; the list below shows which."
result.reading.many       "Many measurements differ clearly from typical businesses; see which ones below."
result.reading.most       "Most measurements are far from typical businesses; see which ones below."
result.scale              "0 = every measurement typical, 100 = every measurement at its extreme. One signal can add at most {max} points."
result.contributors.title "What makes up the score"
result.contributors.none  "No signal raises the score."
result.contributors.item  "{name} +{points}"
```

The existing `signal.<id>.explain`, `.short`, `.why`, `.unavailable` keys stay. `signals.unusualness` is removed (replaced by `signals.distance`).

- [ ] **Step 1: Failing test** (append to `explain.test.ts`):

```ts
describe('plain language', () => {
  it('renders plain, baseline and look-at sentences without leftovers in every locale', () => {
    for (const signal of AVAILABLE)
      for (const locale of SUPPORTED_LOCALES) {
        expect(signalPlain(signal, locale)).not.toMatch(LEFTOVER);
        expect(signalBaseline(signal.id, locale)).not.toMatch(LEFTOVER);
        expect(signalLookAt(signal.id, locale).length).toBeGreaterThan(10);
      }
  });
  it('quotes the thresholds file, not hard-coded numbers', () => {
    expect(baselineParams('single_review_accounts')).toEqual({ low: 30, high: 75 });
    expect(baselineParams('date_entropy')).toEqual({ typicalAbove: 75, extremeBelow: 35 });
    expect(baselineParams('local_guide_ratio')).toEqual({ typicalAtLeast: 20 });
  });
  it('mentions sampling only when it happened', () => {
    const sampled = signalResult({
      id: 'text_similarity',
      value: 0.2,
      details: {
        meanJaccard: 0.2,
        highPairShare: 0.01,
        highPairs: 2,
        pairs: 179700,
        maxPair: 0.7,
        eligible: 812,
        sampled: 600,
      },
    });
    expect(signalPlain(sampled, 'en')).toContain('600 of 812');
    const full = signalResult({
      id: 'text_similarity',
      value: 0.2,
      details: {
        meanJaccard: 0.2,
        highPairShare: 0.01,
        highPairs: 2,
        pairs: 190,
        maxPair: 0.7,
        eligible: 20,
        sampled: 20,
      },
    });
    expect(signalPlain(full, 'en')).not.toContain(' of 20 texts');
  });
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `explain.ts` (functions above; `baselineParams` reads `THRESHOLDS`), write the copy in all four JSON files. **Step 4: Run** `pnpm --filter @signalyze/extension test -- explain i18n && pnpm check:forbidden-words` → PASS. **Step 5: Commit** `feat(extension): plain-language signal sentences in four languages`.

---

### Task 8: Side panel state machine and UI

**Files:**

- Modify: `apps/extension/src/entrypoints/sidepanel/hooks/useAnalysis.ts`, `components/{Home,Collecting,ResultView,SignalList,MainView}.tsx`
- Modify: `apps/extension/src/lib/analysis.ts` (no signature change; callers pass `{ sendToServer: settings.sendToServer && scope.window === 'all' }` and a window-aware `store`)
- i18n keys (all four locales): `home.analyze` "Analyze", `home.scope.limit` "Reviews to load", `home.scope.all` "All (up to {ceiling})", `home.scope.window` "Period", `home.scope.hint` "Loads the reviews at a human pace from the page you are looking at and computes the profile. Nothing runs on its own.", `home.scope.windowHint` "Google shows review dates approximately (\"2 months ago\"), so a period is approximate too.", `window.all` "All time", `window.thisYear` "This year", `window.last12m` "Last 12 months", `window.last6m` "Last 6 months", `window.last3m` "Last 3 months", `window.thisMonth` "This month", `collecting.progressAll` "{count} reviews", `result.window.analysed` "{period}: {inWindow} reviews ({loaded} loaded)", `result.source.window` "computed in your browser for this period", `result.window.notSorted` "Google's Newest order could not be selected; the period was applied to the reviews that were loaded.", `state.insufficient.window` "{count} reviews found in {period}; a score needs at least {min}. Choose a longer period.". Remove `home.analyzeLimit`, `home.loadMore`, `home.analyzeHint`.
- Test: `apps/extension/src/entrypoints/sidepanel/App.test.tsx` (existing smoke), new `components/ResultView.test.tsx`

**Interfaces:**

```ts
// useAnalysis.ts
export type Phase = ... | { kind: 'collecting'; context; count: number; scope: AnalysisScope }
  | { kind: 'analyzing'; context; scope }
  | { kind: 'result'; context; result; fallbackReason; collectStatus; scope; sortedByNewest: boolean; loaded: number };
export interface AnalysisController { phase; analyze: (scope: AnalysisScope) => void; cancel; showCached; back }
```

Flow inside `analyze(scope)`: `limit = resolveLimit(scope.limit)`, `minDate = windowStart(scope.window, new Date())`, send `COLLECT_REVIEWS {limit, minDate}`, on success `reviews = filterByWindow(request.reviews, minDate)`; if `reviews.length === 0` → `fail('collect')`; else `runAnalysis({...request, reviews}, { sendToServer: settings.sendToServer && scope.window === 'all' }, { store: (id, r) => setCachedResult(id, r, scope.window) })`; `loaded = request.reviews.length`; badge is set only when `scope.window === 'all'`.

UI: `Home` renders two `<select>` controls bound to `settings.sampleLimit`/`settings.window` (props `settings`, `update`) and one primary "Analyze" button calling `onAnalyze(scopeOf(settings))`. `Collecting` shows `collecting.progress` when `scope.limit !== 'all'`, else `collecting.progressAll`. `ResultView` adds under the ring: `result.reading.<band>`, `result.scale` with `{max: MAX_SIGNAL_POINTS}`, the contributors list (name via `signalName`), the window line and notes; the insufficient notice uses `state.insufficient.window` when a window is set; the footer keeps "Re-analyse" (same scope). `SignalList`: value column + `signals.distance` percent (`formatShare(unusualness)`), expanded body order plain → baseline → lookAt → why → methodology link; header meta shows `signals.available` and a second line `signals.legend`.

- [ ] **Step 1: Failing test** `ResultView.test.tsx` (render with `I18nProvider locale="en"`, `analysisResult({score: 14, signals: [...]})`): asserts "The measured patterns look like typical businesses.", "What makes up the score", a "+" points entry for the top signal, and for a windowed scope the period label "Last 3 months" and "computed in your browser for this period".
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** as above. **Step 4: Run** `pnpm --filter @signalyze/extension test && pnpm --filter @signalyze/extension typecheck && pnpm lint` → PASS. **Step 5: Commit** `feat(extension): scope and period selectors, readable score card`.

---

### Task 9: Documents, store texts, versions

**Files:** `docs/PRIVACY.md` + `.tr/.de/.es`, `docs/METHODOLOGY.md` + `.tr/.de/.es` (Input section: sampling rule, newest-sort for a period, 2000 ceiling; text_similarity section: `maxEligible`; version table 1.2.0), `docs/LEGAL_NOTES.md` ("at most 500" → "at most 2000"), `docs/STORE_LISTING.md`, `apps/extension/store/listing.md` (four descriptions + permission justification), `apps/landing/src/i18n/{en,tr,de,es}.ts` (`mock.placeMeta`: "… · 1,240 analysed"), `README.md` (limits, `live:check` usage), `CHANGELOG.md` (new `## 0.2.0 - unreleased` block), `apps/extension/package.json` version `0.2.0`.

- [ ] **Step 1:** Edit every file; wording stays measurement-only.
- [ ] **Step 2:** `pnpm check:forbidden-words && pnpm lint && pnpm --filter @signalyze/landing build` → PASS.
- [ ] **Step 3: Commit** `docs: 2000-review scope, periods, sampling; extension 0.2.0`.

---

### Task 10: Live check script and acceptance run

**Files:**

- Create: `apps/extension/scripts/live-check.mjs`
- Modify: `apps/extension/package.json` (`"live:check": "node --import tsx scripts/live-check.mjs"`, devDependency `"tsx": "^4.20.0"`)

Behaviour: `node --import tsx scripts/live-check.mjs "<maps url>" [--limit 500|all] [--window last12m] [--headed] [--channel chrome] [--out <dir>]`.

1. Requires `.output/chrome-mv3`; launches `chromium.launchPersistentContext(profile, { channel, headless: !headed, args: ['--disable-extensions-except=…', '--load-extension=…'] })`; warm-up visit to `https://www.google.com/` and consent click (reuse `CONSENT_BUTTON_TEXTS` from `capture-fixture.mjs`); navigates to the place URL; detects the limited view (`LIMITED_VIEW_PATTERN`) and retries with a fresh profile up to 4 times.
2. Finds the tab via the service worker: `worker.evaluate(() => chrome.tabs.query({ url: 'https://www.google.com/maps*' }))`, then `worker.evaluate(({ tabId, limit, minDate }) => chrome.tabs.sendMessage(tabId, { type: 'COLLECT_REVIEWS', limit, minDate }), …)`.
3. Saves the anonymised request JSON to `--out` (default `.output/live-check/<slug>-<timestamp>.json`).
4. Imports `analyze` from `../../../packages/signals/src/index.ts` and `windowStart`/`filterByWindow` logic (inline copy of the date filter), runs the engine twice, asserts `JSON.stringify(a) === JSON.stringify(b)`.
5. Cross-check: `page.evaluate` counts `[data-review-id] [role="img"][aria-label]` star labels (parse leading digit) into a 1..5 histogram and compares with `result.ratingDistribution` for the all-time run (allowed mismatch: 0).
6. Prints a table: place, loaded, in-window, score, band, contributors, ten signals (`value`, `unusualness`, plain sentence in English via a minimal inline formatter of `details`), determinism OK/FAIL, histogram OK/FAIL, elapsed seconds. Exit code 1 on any FAIL.

- [ ] **Step 1:** Write the script; `pnpm --filter @signalyze/extension build`.
- [ ] **Step 2:** Run on three places: the reported place (Yurtiçi Kargo Billur, search URL `https://www.google.com/maps/search/Yurtiçi+Kargo+Billur`), a large control (`https://www.google.com/maps/search/Pera+Museum+Istanbul`, thousands of reviews, `--limit all`) and a small control (a place with fewer than 15 reviews) with `--window last3m`. Record outputs in the final report.
- [ ] **Step 3: Commit** `feat(extension): live-check script`.

---

### Task 11: Final verification and release commit

- [ ] Run the full check list from Global Constraints, plus `pnpm --filter @signalyze/extension install:test`.
- [ ] Commit any fix-ups; `git log --oneline` shows one commit per task.

---

## Self-review

- Spec coverage: §1 → Task 6 + 8; §2 → Task 7 + 8; §3 → Tasks 1, 2, 3, 5, 8, 9; §4 → Tasks 1, 4, 5, 8, 9; §5 → Task 10; §6 → Task 9. Badge unchanged (Task 8 sets it only for all-time runs).
- Placeholders: none; copy is given verbatim in English, translations are part of Task 7/8/9.
- Type consistency: `AnalysisScope`, `SampleLimit`, `AnalysisWindow`, `windowStart`, `resolveLimit`, `filterByWindow`, `cacheKey`, `sortedByNewest`, `minDate`, `details.sampled`, `THRESHOLDS` are used with the same names in every task.
