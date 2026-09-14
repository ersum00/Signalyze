# Signalyze

A free Chrome extension that shows a **Review Profile** for any Google Maps business: a
statistical summary of when reviews were written, how ratings are distributed, what the reviewers'
histories look like and how similar the texts are. No account, no tracking.

**Install:** [Signalyze on the Chrome Web Store](https://chromewebstore.google.com/detail/signalyze-review-profile/boalccknclijlfkpeaeohcpahidpchcf)

**What it does.** It reads the reviews already visible on the Google Maps page you are looking at,
computes ten measurable signals (for example "62% of reviews were posted within one 14-day
window" or "71% of reviewers have no other review") and combines them into a 0-100 Signalyze
Score. The analysis can cover every review on the page (up to 2000) and can be restricted to a
recent period such as the last 3 months. Every signal is explained in plain language and in
[docs/METHODOLOGY.md](docs/METHODOLOGY.md).

**What it does not do.** It makes no claim about the accuracy of any review, and no claim about
any business or reviewer. The score is a statistical summary of public review data, nothing more.
Signalyze never sends reviewer names, profile links, avatars or user ids anywhere, never stores
review text on the server, and the server never contacts Google. Details: [docs/PRIVACY.md](docs/PRIVACY.md).

## Local setup (3 commands)

```sh
pnpm install                 # installs every TypeScript workspace, prepares the extension
pnpm db:up                   # local PostgreSQL (docker compose), optional for the API cache
pnpm --filter @signalyze/extension dev   # builds the extension in watch mode into apps/extension/.output
```

Load `apps/extension/.output/chrome-mv3` as an unpacked extension in `chrome://extensions`.

API (Python 3.12, [uv](https://docs.astral.sh/uv/)):

```sh
cd apps/api && uv sync && cp .env.example .env && uv run uvicorn signalyze_api.main:app --port 8090 --reload
```

Landing: `pnpm --filter @signalyze/landing dev`.

## Checks

```sh
pnpm lint            # eslint + prettier
pnpm typecheck       # tsc for every workspace
pnpm test            # vitest (TypeScript) + pytest (API, via uv)
pnpm check:forbidden-words
pnpm check:dom-isolation
pnpm build:zip       # Chrome Web Store zip -> apps/extension/.output/*.zip
```

## Live check

```sh
pnpm --filter @signalyze/extension build
pnpm --filter @signalyze/extension live:check "https://www.google.com/maps/search/<place>" --limit all --headed
```

Loads the built extension into a real Chrome, collects the reviews of that page through the extension itself, runs the engine twice and cross-checks the star histogram against the page; add `--window last3m` for a period.

## Adapter fixtures

The Google Maps adapter is tested against captured, anonymised page fixtures in
`apps/extension/src/adapters/google-maps/fixtures/`. To refresh them (headed Chrome works best;
Google limits signed-out sessions after the first load):

```sh
node apps/extension/scripts/capture-fixture.mjs "https://www.google.com/maps/search/Pera+Museum+Istanbul" pera-museum --reviews 40 --headed
UPDATE_FIXTURE_EXPECTED=1 pnpm --filter @signalyze/extension test   # then review the .expected.json diffs
```

## Deploy

```sh
deploy/deploy.sh --push veriskor
```

Step by step, rollback and log locations: [docs/DEPLOY.md](docs/DEPLOY.md).

## Repository layout

```
apps/extension   WXT + React + Tailwind (Manifest V3)
apps/api         FastAPI + asyncpg (computes and caches profiles; never contacts Google)
apps/landing     Astro static site: /, /privacy, /methodology, /changelog
packages/shared  zod schemas, signal definitions, forbidden-word list
packages/signals deterministic signal engine (TypeScript reference; Python port in the API)
deploy/          docker compose, Caddy block, bare-metal nginx/systemd alternative, deploy.sh
docs/            PRIVACY, METHODOLOGY, STORE_LISTING, DEPLOY, DECISIONS, LEGAL_NOTES
```

Methodology: <https://signalyze.veriskor.com/methodology> · Privacy: <https://signalyze.veriskor.com/privacy>

## License

MIT, see [LICENSE](LICENSE). Google Maps and Local Guide are trademarks of Google LLC; Signalyze is not affiliated with Google.
