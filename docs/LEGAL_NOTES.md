# Legal notes

Internal notes on why Signalyze is designed and worded the way it is. Not legal advice; the point is
that every product decision below is enforced in code, not left to discipline.

## 1. Language policy: measurable facts, never accusations

**Risk.** A tool that labels a business's reviews as dishonest, or a reviewer as dishonest, makes a
factual assertion about an identifiable party. If that assertion is wrong, it is potentially
defamatory in most jurisdictions, and it invites takedown demands regardless of merit.

**Position.** Signalyze reports _what the data looks like_, in terms anyone can verify from the
same public page: "62% of reviews were posted within one 14-day window", "71% of reviewers have no
other review", "the review pattern is unusual compared with typical places". These are statements
about the distribution of public data, not about intent, honesty or origin.

**Enforcement.**

- A word list in `packages/shared/forbidden-words.json` (English, Turkish, German, Spanish) is
  checked in CI against every user-facing text: i18n files, docs, landing pages, extension source,
  engine source, API source and deploy files. The build fails on any hit.
- There is no letter grade and no verdict. The 0-100 Signalyze Score is always shown with the
  sentence: _"This score is a statistical summary of public review data; it is not a claim about
  the business or any reviewer."_
- Signals are shown individually, with the formula linked, so a reader can disagree with the
  weighting.
- Below 15 reviews no score is shown at all ("insufficient data"), because small samples produce
  extreme ratios.

## 2. Data minimisation (GDPR / UK GDPR / KVKK / CCPA)

- Reviewer identifiers never leave the browser. The server receives a salted one-way hash that
  rotates daily and is discarded after computation, so it is not usable as a persistent identifier.
- Review text is public but may contain personal data. The server processes it transiently and
  stores only aggregate signals. No text, no hashes and no IP addresses are persisted.
- No accounts, cookies or tracking, so there is no user profile anywhere. The IP address is used
  in memory for rate limiting only; the edge proxy masks it in operational logs.
- Lawful basis for the transient processing: legitimate interest of the user in evaluating public
  information, with the user initiating each analysis by an explicit click after an explicit
  consent screen. `docs/PRIVACY.md` is the public description and is kept identical to the code.

## 3. Relationship to Google

- The extension only reads what Google has already rendered in the user's own tab, on the user's
  explicit action. It never runs automatically, never crawls, and loads at most 500 reviews at a
  human-like pace (one scroll per 600 ms).
- The server never contacts Google. This is enforced by a static test on the API source and a
  runtime guard on the only outbound HTTP client.
- No Google API keys, no Places API, no scraping infrastructure. Google Maps and Local Guide are
  trademarks of Google LLC and are referred to only to describe where the extension works.
- Google's layout can change at any time. Every DOM selector has a self-test; if the expected
  structure is missing the extension shows "Google's layout changed, an update is coming" and shows
  no numbers at all, rather than risk wrong numbers.

## 4. Chrome Web Store policies

- **Single purpose:** show a statistical Review Profile for the Google Maps business page the user
  is viewing. Nothing else.
- **Minimum permissions:** host access to Google Maps domains and the Signalyze API; `storage`,
  `activeTab`, `sidePanel`. Each is justified in `docs/STORE_LISTING.md`.
- **No remote code:** all logic ships in the package. The API returns data only.
- **Limited use:** data obtained from the page is used only to produce the profile shown to the
  user. It is not sold, not used for advertising and not shared.
- **Privacy policy URL:** <https://signalyze.veriskor.com/privacy>.

## 5. Disclaimers shown to users

- Under every score: the statistical-summary sentence quoted in section 1.
- On the landing page footer and the methodology page: Signalyze makes no claim about the accuracy
  of any review and no claim about any business or reviewer.
- Offline analyses are labelled "offline analysis" so the user knows the result was not served
  from the shared cache.

## 6. Things deliberately not built

- No per-review labels, highlights or badges: a per-review mark would be an assertion about a
  specific person's writing.
- No reporting, flagging or "notify Google" features.
- No comparison between named businesses.
- No storage of anything a user typed.
