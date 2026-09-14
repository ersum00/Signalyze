# Chrome Web Store listing

Everything needed to fill in the Developer Dashboard. Texts are final copy; keep them in sync with
the language policy (`pnpm check:forbidden-words` scans this file).

## Identity

| Field              | Value                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Name               | Signalyze: Review Profile for Google Maps                                                          |
| Category           | Productivity › Tools (alternative: Shopping)                                                       |
| Language           | English (default); Turkish, German, Spanish via `_locales`                                         |
| Privacy policy URL | https://signalyze.veriskor.com/privacy                                                             |
| Homepage URL       | https://signalyze.veriskor.com                                                                     |
| Store URL          | https://chromewebstore.google.com/detail/signalyze-review-profile/boalccknclijlfkpeaeohcpahidpchcf |
| Support            | Contact channel of the developer account                                                           |
| Single purpose     | Show a statistical Review Profile for the Google Maps business page the user is viewing            |

## Short description (132 characters max)

```
See the statistics behind a Google Maps rating: timing, reviewer history and text patterns, summed up in one score.
```

(115 characters.)

## Long description

```
Signalyze shows a Review Profile for any business on Google Maps.

Open a place, choose how many reviews to load (200, 500, 1000 or all, up to 2000) and a period (all time, this year, last 12, 6 or 3 months, this month), click Analyze, and the side panel shows ten measurable signals computed from the reviews already on the page:

• Burst ratio: the share of reviews posted within the busiest 14-day window
• Rating polarity: how concentrated the ratings are at 5 and 1 stars
• Single-review accounts: the share of reviewers with no other review
• No photo, short text: the share of reviews with no photo and under 40 characters
• Text similarity: how much review texts overlap with each other
• Template phrases: how often texts consist mostly of stock phrases
• Rating vs text: how often the tone of the text disagrees with the stars
• Date entropy: how evenly reviews are spread over the months
• Local Guide share: how many reviewers are established Local Guides
• Owner responses: how identical the owner's replies are

• Every signal comes with a plain sentence stating its numbers, its typical range and what to look at on the page

The signals are combined into a 0–100 Signalyze Score. The score card explains itself: one sentence on how far the measured patterns sit from typical businesses, the 0–100 scale in words and the signals that contribute most, with their points. Every signal is explained in plain language, with its value, why it matters and a link to the full formula on the methodology page. You also get a reviews-per-month chart, the rating distribution and a summary of the reviewer profile.

This score is a statistical summary of public review data; it is not a claim about the business or any reviewer.

Privacy by design
• No account, no cookies, no analytics, no telemetry.
• Nothing is sent until you click Analyze, and only after you accept the one-time consent screen.
• Reviewer names, profile links, avatars and user ids never leave your browser.
• The server keeps only the computed profile per place for 7 days and never stores review text.
• The server never contacts Google.
• Works fully offline: if the server is unreachable, the same analysis runs in your browser.

Languages: English, Turkish, German, Spanish.

Free and open about how it works: https://signalyze.veriskor.com/methodology
```

## Permission justifications

| Permission                                                        | Justification text for the dashboard                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Host: `https://www.google.com/maps*`, `https://maps.google.com/*` | Required to read the review panel of the Google Maps business page the user is viewing and to show the score badge next to the business name. The content script runs only on Maps place pages and only acts when the user clicks Analyze (it scrolls the review list at one step per 600 ms, up to 2000 reviews). |
| Host: `https://api.signalyze.veriskor.com/*`                      | Required to send the stripped-down review data (ratings, dates, texts, public reviewer counts, photo counts; no identifiers) to the Signalyze API, which computes and caches the profile.                                                                                                                          |
| `storage`                                                         | Stores the user's settings (language, badge on/off, data-sending consent) and a local cache of profiles already viewed.                                                                                                                                                                                            |
| `activeTab`                                                       | Lets the side panel know which Google Maps tab is active when the user opens it from the toolbar icon.                                                                                                                                                                                                             |
| `sidePanel`                                                       | The Review Profile is shown in Chrome's side panel next to the map so the page itself is not modified beyond a small badge.                                                                                                                                                                                        |

Remote code: **none**. All logic ships in the package; the API returns JSON data only.

Data usage disclosure (dashboard checkboxes): the extension collects "Website content" (review text
and public review metadata from the page being viewed) solely to provide the Review Profile. It does
not collect personally identifiable information, health, financial, authentication, personal
communications, location, web history or user activity. Data is not sold, not used for purposes
unrelated to the single purpose, and not used for creditworthiness or lending.

## Screenshots (1280×800, five scenes)

1. **Hero: badge and side panel.** A busy café page on Google Maps with the Signalyze badge showing "42" next to the business name and the side panel open on the score card with the mandatory sentence beneath it. Caption: "One click, one statistical summary."
2. **Signal list.** Side panel scrolled to the ten signals; `burst_ratio` expanded to show "62% of reviews were posted within one 14-day window (12 Mar – 25 Mar 2026)", "why it matters" and the methodology link. Caption: "Every signal explained, with its number."
3. **Charts.** Reviews-per-month bar chart with a visible spike, rating distribution bars below. Caption: "See the timing and the shape of the ratings."
4. **Reviewer profile and offline label.** The reviewer summary tiles (single-review share, median review count, Local Guide share, photo share) with the "offline analysis" label visible. Caption: "Works without the server, too."
5. **Consent and settings.** The one-time consent screen listing what is sent and what is never sent, next to the settings page (language, badge, data sending, clear cache). Caption: "Nothing leaves your browser until you say so."

Screenshots are taken from real pages with the business name and reviewer names blurred; the
score shown must be a real computed value, never an edited one.

## Promo video / GIF storyboard (15 s)

1. 0–3 s: Google Maps, a restaurant page. Cursor hovers the Signalyze badge (grey, "Analyze").
2. 3–7 s: click; the review panel scrolls by itself, a progress counter runs "48 / 200 reviews".
3. 7–12 s: the side panel fills: score ring animates to its value, the signal list appears, one signal expands.
4. 12–15 s: the mandatory sentence fades in under the score; end card "Signalyze · signalyze.veriskor.com".

## Release checklist

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm check:forbidden-words && pnpm check:dom-isolation`
- [ ] `pnpm build:zip` → `apps/extension/.output/signalyze-<version>-chrome.zip` (built without the dev `key`; the Store assigns the id), then `pnpm --filter @signalyze/extension install:test`
- [ ] Version bumped in `apps/extension/package.json`, entry added to `CHANGELOG.md`
- [ ] Privacy page live and identical to `docs/PRIVACY.md`
- [ ] After the first upload: copy the Store public key into `apps/extension/extension-key.json`, add the Store id to `EXTENSION_IDS` on the server, redeploy the API
- [ ] Screenshots reflect the current UI (no text edits on top of real results)
