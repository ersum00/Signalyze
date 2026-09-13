# Methodology

_Engine version 1.1.0. This document is the single source of truth for how each signal and the Signalyze Score are computed. The landing page `/methodology` is generated from it, and the code in `packages/signals` (TypeScript) and `apps/api/signalyze_api/engine` (Python) implements exactly what is written here; both implementations are held to the same test fixtures._

Signalyze computes ten deterministic signals from the reviews visible on a Google Maps business page. Every signal is a number between 0 and 1 that expresses how unusual the measured value is compared with what typical reviewed places look like; 0 means "unremarkable", 1 means "as unusual as we ever see". The Signalyze Score (0-100) is a weighted combination of the signals that could be computed. No language model is involved and nothing is inferred about intent: each signal is a fact about the distribution of public data that anyone can recompute from the same page.

**This score is a statistical summary of public review data; it is not a claim about the business or any reviewer.**

## Input

The engine receives, per review: star rating (1-5), calendar day, text, the reviewer's public review count (if visible), photo count, Local Guide level (if visible), owner response text (if any). It never receives names, profile links or user ids. See [Privacy](/privacy).

The extension loads up to 200 reviews (500 with "Load more") in Google's default "Most relevant" order, so the sample is the part of the review history Google chose to show first, not a random or chronological sample. Signals are computed on that sample and the side panel always shows how many reviews were analysed out of the displayed total.

## Preprocessing

- **Dates** are parsed from relative labels ("2 weeks ago") in the browser and rounded to a calendar day. Month subtraction is calendar-based, so "3 months ago" on 31 May is 28 or 29 February.
- **Text normalisation**: Unicode NFKC, lower-case, every character that is not a letter, digit or whitespace becomes a space, whitespace collapsed, trimmed. Lengths are counted in Unicode code points.
- **Language of a text** is decided in two steps. The script of its letters comes first: any kana makes it Japanese, any Hangul Korean, any Han character (without kana) Chinese, any Arabic letter Arabic. Cyrillic texts then vote between Russian and Ukrainian, and Latin-script texts vote among English, Spanish, Portuguese, French, German, Italian, Turkish, Dutch, Polish, Indonesian, Vietnamese and Swedish, using small stopword lists (most hits wins; ties resolve in that order, and a text without any stopword hit is Russian or English respectively). Texts in other scripts (Thai, Devanagari, Greek, Hebrew, ...) get no dictionary. The language only selects which phrase dictionary and tone lexicon apply; it is never reported.
- Reviews are processed in a fixed order, sums are accumulated in that order, and every reported number is rounded half-up to six decimals, so the TypeScript and Python implementations produce identical output.

## From a measurement to "unusualness"

Every signal produces a raw measurement (mostly a share between 0 and 1) and maps it to unusualness with a linear ramp between two calibration points:

```
unusualness = clamp((value - low) / (high - low), 0, 1)
```

`low` is the level at which the signal starts to count (typical places sit at or below it), `high` is the level at which it counts fully. The calibration points live in `packages/signals/data/thresholds.json` and are listed per signal below. They are engine version 1.1.0 estimates chosen from the shape of public Google Maps review data and from synthetic datasets; they will be revised with new engine versions and every revision is recorded in the changelog.

## The signals

### 1. `burst_ratio` (weight 0.16)

**Measures:** the share of reviews that fall inside the single busiest 14-day window.

**How:** sort review days; slide a 14-day window and take the maximum count; `peakShare = peak / n`. An even flow over the place's lifespan would put `expectedShare = 14 / lifespanDays` reviews in any window, so the excess beyond that is `excess = (peakShare - expectedShare) / (1 - expectedShare)`. If the whole history fits in 14 days there is nothing to compare against and the excess is 0.

**Ramp:** `excess` from 0.05 to 0.65.

**Why it matters:** review flow at established places is spread out; a large share of all reviews arriving within two weeks is measurable and rare. The details include the window's dates so it can be checked on the page.

### 2. `rating_polarity` (weight 0.08)

**Measures:** the share of 5-star plus 1-star ratings among all ratings.

**How:** `share = (count5 + count1) / n`.

**Ramp:** 0.82 to 0.96. Google ratings are strongly skewed to 5 stars, so a high polarity share is normal; only distributions that almost entirely avoid 2-4 stars are counted.

**Why it matters:** a distribution concentrated at both extremes differs from the smooth, 5-heavy shape most places have.

### 3. `single_review_accounts` (weight 0.14)

**Measures:** the share of reviewers whose public review count is 0 or 1.

**How:** among reviews where the count is visible, `share = count(reviewCount <= 1) / known`. Requires at least 15 known counts, otherwise unavailable.

**Ramp:** 0.30 to 0.75.

**Why it matters:** most Google reviewers have written more than one review. A large share of reviewers whose only review is this one is a measurable difference from that baseline.

### 4. `no_photo_short_text` (weight 0.08)

**Measures:** the share of reviews with no photo and fewer than 40 characters of text.

**How:** `share = count(photoCount == 0 and textLength < 40) / n`.

**Ramp:** 0.60 to 0.95. Rating-only reviews are common on Google, so only a very high share counts.

**Why it matters:** photos and longer texts take effort; their near-total absence is measurable.

### 5. `text_similarity` (weight 0.16)

**Measures:** how much review texts overlap with each other.

**How:** for every review with at least 20 characters of normalised text, build the set of character 3-grams (spaces included). For every pair compute the Jaccard similarity `|A ∩ B| / |A ∪ B|`. Report the mean over all pairs and the share of pairs above 0.5 ("near-duplicate pairs"). Requires at least 10 eligible texts.

**Ramp:** the larger of mean Jaccard from 0.18 to 0.45 and near-duplicate pair share from 0.02 to 0.15.

**Why it matters:** independently written texts about the same place share some words but very few 3-gram-level fragments. High overlap is measurable regardless of language.

### 6. `template_phrases` (weight 0.08)

**Measures:** the share of reviews whose text consists mostly of stock phrases.

**How:** per language, a dictionary of common stock phrases ("highly recommend", "kesinlikle tavsiye ederim", "sehr zu empfehlen", "muy recomendable", "je recommande", "また来たい", "强烈推荐", ...) is matched on the normalised text with word boundaries; for Japanese and Chinese, which are written without spaces, phrases are matched as plain substrings. A review is phrase-based when the matched phrases cover at least 50% of its characters. `share = phraseBased / withText`. Requires at least 10 reviews with text. Texts whose language has no dictionary count in `withText` but are never phrase-based. The three most frequent phrases are reported.

**Ramp:** 0.15 to 0.50.

**Why it matters:** stock phrases are common in everyday reviews too, which is why only texts that are mostly stock phrases count, and only their share among texts matters.

### 7. `rating_text_mismatch` (weight 0.08)

**Measures:** how often the tone of the text disagrees with the star rating.

**How:** per language, a small lexicon of positive and negative words gives `tone = (positive - negative) / (positive + negative)` over the tokens of a review. For Japanese and Chinese the lexicon entries are matched as substrings of the normalised text, longest entries first, each entry counted once and removed before shorter entries are tried, so a negated form such as 不好吃 in the negative list is not also counted as 好吃. Reviews with no lexicon hit, and texts whose language has no dictionary, are not scored. A mismatch is a rating of 4 or 5 with tone ≤ -0.5, or a rating of 1 or 2 with tone ≥ 0.5. `share = mismatches / scored`. Requires at least 10 scored reviews.

**Ramp:** 0.10 to 0.35. The lexicon does not handle negation or sarcasm, so a baseline of mismatches is expected and does not count.

**Why it matters:** text and stars normally agree; systematic disagreement is measurable.

### 8. `date_entropy` (weight 0.08)

**Measures:** how evenly reviews are spread over the months between the first and the last review.

**How:** count reviews per calendar month; Shannon entropy `H = -Σ p_i log2 p_i` over the months, normalised by `log2(monthsInSpan)`. 1 means perfectly even, 0 means everything in one month. Requires a span of at least 3 months. The busiest month and its share are reported.

**Ramp:** `1 - normalisedEntropy` from 0.25 to 0.65.

**Why it matters:** complements `burst_ratio` at the scale of months; seasonal places have somewhat lower entropy, which the ramp tolerates.

### 9. `local_guide_ratio` (weight 0.06)

**Measures:** the share of reviews written by Local Guides of level 3 or higher.

**How:** only computed when the page exposed a level for at least one reviewer; otherwise unavailable, because a missing level cannot be distinguished from "not a Local Guide". `share = count(level >= 3) / n`. The unusual direction is a low share.

**Ramp:** shortfall `0.20 - share` from 0 to 0.20 (share 0 → 1, share ≥ 0.20 → 0).

**Why it matters:** established Local Guides are a normal part of the reviewer mix at most places.

### 10. `owner_response_pattern` (weight 0.08)

**Measures:** how identical the owner's responses are.

**How:** among reviews with an owner response, group normalised responses; `identicalShare = 1 - distinct / responded`. Requires at least 5 responses. The response rate and the largest group's share are reported.

**Ramp:** 0.60 to 0.95. Many owners reuse a thank-you line, so only near-total repetition counts.

**Why it matters:** it is a small, measurable aspect of how the page is managed; it is weighted low.

## The Signalyze Score

```
score = round( 100 × Σ (w_i × u_i) / Σ w_i )   over available signals i
```

Weights (`packages/signals/src/weights.json`, version 1.1.0):

| Signal                 | Weight |
| ---------------------- | ------ |
| burst_ratio            | 0.16   |
| text_similarity        | 0.16   |
| single_review_accounts | 0.14   |
| rating_polarity        | 0.08   |
| no_photo_short_text    | 0.08   |
| template_phrases       | 0.08   |
| rating_text_mismatch   | 0.08   |
| date_entropy           | 0.08   |
| owner_response_pattern | 0.08   |
| local_guide_ratio      | 0.06   |

Weights are renormalised over the signals that are available for the place, so a signal that could not be computed (for example because Local Guide levels are not shown) never moves the score in either direction. The score is a weighted mean, so a single signal can raise it by at most its weight share: a place with an extreme burst and nothing else unusual lands around 25, not 90. That is intentional; the side panel shows every signal individually so the reader sees which one is responsible.

**No score below 15 reviews.** With fewer reviews the shares above swing wildly, so the extension shows "insufficient data" and no number.

## What the synthetic datasets look like

The engine ships with seeded synthetic datasets used in tests and as cross-implementation fixtures (`packages/signals/fixtures/`). Their scores at engine 1.1.0, for orientation:

| Dataset      | Description                                                                          | Score                            |
| ------------ | ------------------------------------------------------------------------------------ | -------------------------------- |
| normal       | steady flow over three years, mixed ratings, natural texts                           | 1-3                              |
| polarized    | mostly 5- and 1-star ratings                                                         | 7-12                             |
| burst        | 60% of reviews within one 14-day window, mostly single-review accounts               | 24                               |
| template     | stock-phrase texts, near-duplicates, single-review accounts, identical owner replies | 43-53                            |
| sparse       | ratings only, no text or reviewer data                                               | 21 (only four signals available) |
| multilingual | natural and stock-phrase texts in all 18 covered languages plus Thai, Hindi, Greek   | 4                                |

## Limitations

- The sample is Google's "Most relevant" ordering, not the full history.
- Relative dates limit precision to roughly a day for recent reviews and a month or a year for old ones.
- Lexicons and phrase dictionaries cover 18 languages: English, Spanish, Portuguese, French, German, Italian, Turkish, Dutch, Polish, Indonesian, Vietnamese, Swedish, Russian, Ukrainian, Arabic, Japanese, Chinese and Korean. Texts in other languages contribute to timing, rating and reviewer signals but not to the text signals (a Latin-script text in an uncovered language falls back to the English dictionaries, which rarely match it). The dictionaries are small and match surface forms only, with no stemming, negation handling or sarcasm detection, so heavily inflected languages get fewer hits per text.
- Local Guide levels are often not shown in the review list; the signal is then unavailable rather than guessed.
- The calibration points are version 1.1.0 estimates. Changing any of them is an engine version bump, recorded in the changelog, and the server cache is keyed by engine version.

## Optional language model (off by default)

Engine 1.1.0 includes an optional server-side step that can be enabled by the operator: when `text_similarity` is already high, up to 30 texts (no reviewer data) are sent to an OpenAI-compatible endpoint that returns one number, a 0-1 "writing homogeneity" estimate, reported in the `text_similarity` details as `llmHomogeneity`. It never labels individual reviews and never changes the score in this version. It is disabled unless both `LLM_BASE_URL` and `LLM_API_KEY` are configured; the public Signalyze API currently runs with it disabled.
