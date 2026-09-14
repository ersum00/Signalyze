# Plain-language results, full-history scope and time window

Date: 2026-09-14. Status: approved in chat, implementation follows.

## Why

A first real user test (a cargo branch, 643 reviews, score 14) showed three problems:

1. The score and the signal rows are correct but unreadable for a lay user. "Unusualness 0.27" has
   no reference point; nothing says what 14 out of 100 means or which signals produced it.
2. The extension stops at 500 reviews, so places with more reviews are judged on a partial,
   relevance-ordered sample.
3. There is no way to look at the recent history only. For hotels, restaurants and shops the
   last months matter more than a five-year-old burst.

A fourth request, "tell the reader whether to trust the reviews", conflicts with the language
policy in `docs/LEGAL_NOTES.md` (no verdict about a business or a reviewer; enforced by the
forbidden-word check in CI). The design keeps the policy and gets as close as it allows: every
number is put next to its typical range, every signal ends with a concrete "what to look at"
sentence, and the score card says in plain words how far the measurements sit from typical places.
The reader draws the conclusion; the product never states it.

## 1. Score card

Below the ring, three new elements, all measurement language:

- **Reading line** by band of the 0-100 score. 0-19 "the measured patterns look like typical
  businesses"; 20-39 "some measurements differ from typical businesses"; 40-59 "many measurements
  differ clearly from typical businesses"; 60-100 "most measurements are far from typical
  businesses". Bands are constants in `apps/extension/src/lib/reading.ts`.
- **Scale line**: "0 = every measurement typical, 100 = every measurement at its extreme. One
  signal can add at most its weight (up to 16 points)."
- **Contributors**: the signals that raised the score, top three, with their points. Points of
  signal _i_ = round(100 × w_i × u_i / Σ w_available), computed in the side panel from the
  published weights (`WEIGHTS` from `@signalyze/signals`). When no signal contributes: "No signal
  raises the score."

The mandatory sentence stays under the card, unchanged.

## 2. Signal rows

- The bar label "Unusualness 0.27" becomes "Distance from typical: 27%". The section header
  carries the legend "0% = typical · 100% = extreme".
- The expanded row shows, in this order: the **plain sentence** (numbers with their units and
  counts), the **baseline sentence** (the typical range and the extreme threshold from
  `packages/signals/data/thresholds.json`, so the ranges can never drift from the engine), the
  **look-at sentence** (what a reader can check on the page), then the existing "why it matters"
  and the methodology link. Unavailable signals keep their current reason sentence.
- Baseline numbers are passed as parameters from the thresholds file; the i18n strings only hold
  wording. Signals whose low direction is unusual (date entropy, Local Guide share) say so.
- Text similarity mentions sampling when it happened ("600 of 812 texts, evenly spaced").

Wording in all four languages must pass `pnpm check:forbidden-words`.

## 3. Scope: how many reviews

- Home shows a **review count** selector: 200, 500, 1000, All. "All" loads until Google shows no
  more, with a hard ceiling of 2000 (`ALL_REVIEWS_CEILING`). The pace stays one scroll per 600 ms;
  the time budget is the ceiling times the interval times three.
- The "Load more" buttons go away; "Re-analyse" reuses the current scope.
- The last chosen scope is stored in settings (`sampleLimit`).
- `MAX_REVIEWS_PER_REQUEST` becomes 2000 in the shared constants and the API models; the API body
  guard becomes 8 MB. The local result cache keeps 200 entries.
- The engine's text-similarity signal caps the pairwise comparison at 600 eligible texts
  (`thresholds.text_similarity.maxEligible`), picking indices `floor(i × n / 600)` in input order
  so both runtimes select the same texts. `details.sampled` reports the number used. Every other
  signal is linear and runs on all reviews. Engine version becomes 1.2.0 (weights and thresholds
  files); fixtures are regenerated and a new `large` fixture with more than 600 eligible texts
  locks the sampling in the Python parity test.

## 4. Time window

- Home shows a **period** selector: all time, this year, last 12 months, last 6 months, last 3
  months, this month. Stored in settings (`window`). Window start is computed in UTC from the
  current date (`apps/extension/src/lib/window.ts`).
- When a window other than "all time" is chosen, the collector asks the adapter to switch
  Google's sort order to **Newest** before reading. New rules in `selectors.ts`: `sortButton`
  (`button[aria-haspopup]` in the main panel labelled with a "sort" word in a known UI language,
  else the only such button above the review list) and `sortMenuNewest` (the `[role="menuitemradio"]`
  whose text matches a "newest" word, else the second item of the menu, which is Google's fixed
  order: most relevant, newest, highest, lowest). If either rule finds nothing the collector
  continues in the default order and reports `sortedByNewest: false`.
- With newest order active the loop stops early once two consecutive rounds added only reviews
  older than the window start. `CollectOptions.minDate` carries the window start.
- The side panel filters the collected reviews by `date >= windowStart` before analysis. Fewer
  than 15 reviews in the window shows the existing "not enough reviews" notice with the window
  named.
- Windowed analyses run in the browser with the bundled engine and are never sent to the server:
  the server cache holds one profile per place, and a windowed profile is a personal view. The
  local cache key is `${placeId}|${window}` so the all-time profile is not overwritten. The result
  card labels the period and, when the sort switch failed, says the period was applied to the
  loaded reviews only. A note reminds that Google shows dates approximately ("2 months ago").
- The on-page badge keeps showing the all-time cached score only.

## 5. Live check

`apps/extension/scripts/live-check.mjs <maps url> [--limit 500|all] [--window 12m] [--headed]`
loads the built extension into real Chrome via Playwright (same warm-up as the fixture capture
script), sends `COLLECT_REVIEWS` to the content script through the extension service worker, saves
the anonymised request, runs the TypeScript engine on it twice and prints: review counts, the
score, every signal with its plain sentence, a determinism check (both runs byte-identical) and
an independent cross-check of the rating distribution against star labels read straight from the
page after collection. The script is documented in the README and used for the acceptance run on
the place from the user report plus two control places.

## 6. Documents and versions

Privacy, methodology and store texts in four languages, legal notes, the landing mock text and
the README are updated to the new limits, the sampling rule and the newest-sort behaviour.
Extension version 0.2.0, changelog entry, engine 1.2.0. The Chrome Web Store description must be
re-submitted by the owner after release.

## Not in scope

Server-side windowed profiles, per-review marks, any new permission, changes to the badge, more
than the six periods listed.
