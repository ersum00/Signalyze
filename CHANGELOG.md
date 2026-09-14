# Changelog

All notable changes to Signalyze are recorded here. The version number is the extension version; the API and the site are released together with it.

## 0.2.0 - unreleased

- Reviews to load: 200, 500, 1000 or every review on the page (up to 2000), chosen on the Home view; the "Load more" buttons are gone.
- Period filter: this year, last 12/6/3 months or this month. The extension switches Google's sort order to Newest, stops once the list has moved past the period and keeps only reviews dated within it; period profiles are computed in the browser, never sent to the server, and cached separately from the all-time profile.
- Score card explains itself: a plain reading sentence by band, the 0–100 scale in words and the signals that make up the score with their points.
- Every signal row shows its distance from typical and, expanded, a plain-language sentence with the numbers, the typical range and extreme threshold from the calibration file, and what to look at on the page.
- Signal engine 1.2.0: text similarity compares at most 600 evenly spaced texts so a 2000-review analysis stays fast; profiles computed by 1.1.0 are recomputed.
- API accepts up to 2000 reviews and 8 MB per request.
- `live-check` script: loads the built extension into a real Chrome and verifies collection, determinism and the star histogram on a live Google Maps page.

## 0.1.0 - unreleased

Initial feature set.

- Chrome extension (Manifest V3) that shows a Review Profile in the side panel for the Google Maps business page you are viewing.
- Ten deterministic signals: burst ratio, rating polarity, single-review accounts, no-photo/short-text share, text similarity, template phrases, rating and text mismatch, date entropy, Local Guide ratio and owner response pattern.
- Signalyze Score (0 to 100) as a weighted combination of the signals that could be computed; below 15 reviews no score is shown ("insufficient data").
- Reviews-per-month chart, rating distribution and reviewer-profile summary next to the score.
- Analysis starts only on an explicit click; loads up to 200 reviews, or 500 with "Load more", at one scroll per 600 ms.
- One-time consent screen; when data sending is declined or the API is unreachable the same engine runs inside the browser and the result is labelled "offline analysis".
- Signalyze API (FastAPI) that computes and caches profiles per place for 7 days, stores no review text and never contacts Google.
- Interface languages: English, Turkish, German and Spanish.
- Landing site with methodology, privacy and changelog pages generated from the repository documents.
- Google Maps adapter reads dates, the Reviews tab, owner responses and number formats in 30 interface languages, with structural fallbacks.
- Landing site in English, Turkish, German and Spanish, with translated privacy and methodology pages.
- Chrome Web Store kit: listing texts in four languages, icon, five screenshots and promo tiles (apps/extension/store).
- Language policy enforced in CI: user-facing text describes measurable patterns only.
- Signal engine 1.1.0: text signals cover 18 languages (English, Spanish, Portuguese, French, German, Italian, Turkish, Dutch, Polish, Indonesian, Vietnamese, Swedish, Russian, Ukrainian, Arabic, Japanese, Chinese, Korean) with script-based language detection and substring matching for Japanese and Chinese; cached profiles computed by engine 1.0.0 are recomputed.
