# Privacy

_Last updated: 2026-09-12. This page describes exactly what the Signalyze extension and the Signalyze API do with data. It is written to match the code; if the code changes, this page changes with it._

## The short version

- Signalyze has no accounts, no cookies, no analytics and no telemetry.
- Nothing leaves your browser until you click **Analyze**, and only after you have accepted the one-time consent screen.
- What is sent is a stripped-down copy of the reviews already visible on the Google Maps page: star rating, calendar day, review text, the reviewer's public review count, photo count and Local Guide level. Reviewer names, profile links, avatars and user ids are never sent.
- The server keeps only the computed profile (signals and score) per place for 7 days. It never stores review text and never contacts Google.
- If the server cannot be reached, the analysis runs entirely inside your browser.

## What the extension reads

When you open a business page on Google Maps and click **Analyze**, the extension reads the review panel that Google has already rendered in your tab. It scrolls the panel to load up to 200 reviews (or up to 500 if you choose "Load more"). It does not visit any other page, does not open reviewer profiles and does not read anything outside the business page you are looking at.

## What is sent to the Signalyze API

One request per analysis, containing:

| Field                                           | Example                         | Why it is needed                                                                  |
| ----------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------- |
| Place identifier (from the page URL)            | `0x14cab...:0x8e3f...`          | Cache key so the same place is not recomputed for every user                      |
| Per review: star rating                         | `5`                             | Rating-shape signals                                                              |
| Per review: calendar day                        | `2026-03-14`                    | Timing signals (day precision only; no time of day)                               |
| Per review: text                                | "Great coffee, friendly staff." | Text-similarity, template and rating/text consistency signals                     |
| Per review: reviewer's total review count       | `12`                            | Reviewer-history signals                                                          |
| Per review: number of attached photos           | `1`                             | Photo/short-text signal                                                           |
| Per review: Local Guide level, if shown         | `4`                             | Reviewer-history signals                                                          |
| Per review: owner response text, if any         | "Thank you for visiting."       | Owner-response pattern signal                                                     |
| Per review: a one-way hash                      | 64 hex characters               | Lets the engine count distinct reviewers without knowing who they are (see below) |
| Displayed total review count and overall rating | `1,240` / `4.4`                 | Shown for context; used to note how much of the total was analysed                |
| Interface language and extension version        | `en` / `0.1.0`                  | Picks the phrase dictionary; compatibility                                        |

**The one-way hash.** For each review the extension computes `sha256(reviewerId + placeId + dailySalt)` where the daily salt is a random value generated in your browser and rotated every day. The server receives only the hash. It cannot recover the reviewer id from it, cannot link the same reviewer across two different places, and cannot link the same reviewer across two different days. The hash is used during computation only and is discarded when the response is sent.

## What is never sent

- Reviewer names, profile URLs, avatars, user ids or any other reviewer identifier.
- Your Google account, your name, your email address or any information about you.
- Your browsing history, the contents of other tabs, cookies or local storage.
- Your precise location. The API sees the IP address of the request (as every web server does); it is not stored, see "Logs".

## What the server stores

| Data                                                                                                            | Where                                 | For how long                                        |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------- |
| Computed profile per place: signal values, score, monthly counts, rating distribution, reviewer-profile summary | PostgreSQL, keyed by place identifier | 7 days, then deleted                                |
| Daily counters: number of analyses, number of cache hits                                                        | PostgreSQL                            | Indefinitely (two integers per day, no identifiers) |

Review text, reviewer hashes and IP addresses are **not** stored. The server performs the computation in memory and keeps only the result.

## Logs

The API writes one access-log line per request containing the method, path, status code, duration and an anonymised address: the last octet of IPv4 addresses is replaced by 0 and IPv6 addresses are cut to their first three groups. No query strings, no request bodies. The hosting edge proxy that terminates TLS masks addresses the same way in its operational logs. Both logs live in container output and are retained briefly for troubleshooting. Rate limiting (60 analyses per IP per hour) uses the full IP address in memory only and never writes it anywhere.

## What the extension stores in your browser

- Your settings (language, badge on/off, data-sending consent).
- A local cache of profiles you have viewed, so reopening a place is instant. You can clear it any time from Settings, and it is removed when you uninstall the extension.

Everything is kept in the extension's own `chrome.storage.local`; nothing is synced to Google or to us.

## The server never contacts Google

The Signalyze API makes no requests to Google, Google Maps or any Google service. This is enforced by an automated test in the codebase that fails if any Google hostname appears in the API source, and by a runtime guard on the API's only outbound HTTP client.

## Optional server-side language model (currently off)

A future version may use a language model to produce a single **numeric** "writing homogeneity" value when the text-similarity signal is already high. If enabled, it would send at most 30 review texts, without any reviewer data, to the configured model endpoint, and would receive one number back. It never labels individual reviews. This feature is disabled unless the operator explicitly configures it, and this page will be updated before it is turned on.

## Permissions the extension requests

| Permission                             | Why                                                                 |
| -------------------------------------- | ------------------------------------------------------------------- |
| Access to Google Maps pages            | To read the reviews on the business page you are viewing            |
| Access to `api.signalyze.veriskor.com` | To send the stripped-down review data and receive the profile       |
| `storage`                              | Settings and local cache                                            |
| `activeTab`                            | To know which business page is open when you click the toolbar icon |
| `sidePanel`                            | To show the Review Profile next to the page                         |

## Your choices

- Decline the consent screen: the extension then runs every analysis locally in your browser and sends nothing.
- Turn off data sending later in Settings: same effect.
- Clear the local cache in Settings.
- Uninstall the extension: removes all local data. Server-side, profiles are keyed by place, not by user, and expire after 7 days.

## Contact

Questions about this page can be sent through the contact channel listed on the Chrome Web Store listing for Signalyze.
