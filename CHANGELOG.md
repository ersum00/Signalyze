# Changelog

All notable changes to Signalyze are recorded here. The version number is the extension version; the API and the site are released together with it.

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
- Language policy enforced in CI: user-facing text describes measurable patterns only.
