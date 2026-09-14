#!/usr/bin/env node
/* eslint-disable no-restricted-syntax -- Playwright evaluate() runs inside the page, not extension code */
/* global chrome -- available inside the extension service worker */
/**
 * Live acceptance check against a real Google Maps page.
 *
 * Loads the built extension (.output/chrome-mv3) into a real Chrome via
 * Playwright, opens the place, asks the extension's own content script to
 * collect the reviews (the same COLLECT_REVIEWS message the side panel
 * sends), runs the TypeScript engine on the anonymised request twice and
 * cross-checks the star histogram against an independent read of the page.
 *
 *   pnpm --filter @signalyze/extension build
 *   node --import tsx scripts/live-check.mjs "<google maps url>" \
 *     [--limit 200|500|1000|all] [--window all|thisYear|last12m|last6m|last3m|thisMonth] \
 *     [--headed] [--channel chrome|msedge|chromium] [--executable <chrome.exe>]  *     (channel defaults to chromium: branded Chrome ignores --load-extension since 137) \
 *     [--hl en] [--out <dir>] [--timeout 90000] [--allow-limited]
 *
 * Exit code 1 when collection fails, the engine is not deterministic or the
 * histogram read from the page disagrees with the collected reviews.
 * Google serves automated-looking sessions a "limited view" (five reviews,
 * no paging); the script retries with a fresh profile, and --headed is the
 * most reliable mode on a desktop. Run "pnpm exec playwright install chromium"
 * once so the Chromium build Playwright expects is present.
 */
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { analyze, ENGINE_VERSION, WEIGHTS } from '../../../packages/signals/src/index.ts';
import {
  ALL_REVIEWS_CEILING,
  MIN_REVIEWS_FOR_SCORE,
  SIGNAL_IDS,
  isAnalysisWindow,
  isSampleLimit,
  resolveLimit,
  windowStart,
} from '../../../packages/shared/src/index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXTENSION_DIR = join(HERE, '..', '.output', 'chrome-mv3');
const DEFAULT_OUT_DIR = join(HERE, '..', '.output', 'live-check');
const MAX_ATTEMPTS = 4;
const CONSENT_BUTTON_TEXTS = [
  'Accept all',
  'Reject all',
  'Tümünü kabul et',
  'Tümünü reddet',
  'Alle akzeptieren',
  'Alle ablehnen',
  'Aceptar todo',
  'Rechazar todo',
  'I agree',
];
/** Banner Google shows on its signed-out "limited view" page, in the supported UI languages. */
const LIMITED_VIEW_PATTERN =
  /limited view|sınırlı (bir )?görünüm|eingeschränkte Ansicht|vista limitada/i;
const MAPS_TAB_URLS = ['https://www.google.com/maps*', 'https://maps.google.com/*'];

class RetryableError extends Error {}

function parseArgs(argv) {
  const positional = [];
  const options = {
    limit: 'all',
    window: 'all',
    headed: false,
    // Branded Chrome (channel "chrome") no longer loads unpacked extensions from the command
    // line since Chrome 137; Playwright's Chromium build does, headed or headless.
    channel: 'chromium',
    executable: process.env.SIGNALYZE_CHROMIUM_EXECUTABLE ?? null,
    hl: 'en',
    out: DEFAULT_OUT_DIR,
    timeout: 90_000,
    // Continue on Google's "limited view" (a handful of reviews, no paging) instead of retrying:
    // proves the extension's collection path end to end even when the full page is withheld.
    allowLimited: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--headed') options.headed = true;
    else if (arg === '--allow-limited') options.allowLimited = true;
    else if (arg === '--limit') {
      const raw = String(argv[++i]);
      options.limit = raw === 'all' ? 'all' : Number(raw);
    } else if (arg === '--window') options.window = String(argv[++i]);
    else if (arg === '--channel') options.channel = String(argv[++i]);
    else if (arg === '--executable') options.executable = String(argv[++i]);
    else if (arg === '--hl') options.hl = String(argv[++i]);
    else if (arg === '--out') options.out = String(argv[++i]);
    else if (arg === '--timeout') options.timeout = Number(argv[++i]);
    else if (arg.startsWith('--')) throw new Error(`Unknown option ${arg}`);
    else positional.push(arg);
  }
  const [url] = positional;
  if (!url) {
    throw new Error(
      'Usage: live-check.mjs "<google maps url>" [--limit all] [--window all] [--headed] [--channel chrome] [--out <dir>]',
    );
  }
  if (!isSampleLimit(options.limit)) throw new Error('--limit must be 200, 500, 1000 or all');
  if (!isAnalysisWindow(options.window)) {
    throw new Error('--window must be all, thisYear, last12m, last6m, last3m or thisMonth');
  }
  return { url, ...options };
}

function log(message) {
  process.stdout.write(`[live-check] ${message}\n`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function withLanguage(url, hl) {
  const parsed = new URL(url);
  parsed.searchParams.set('hl', hl);
  return parsed.toString();
}

async function dismissConsent(page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const onConsentPage = /consent\.google\./.test(page.url());
    let clicked = false;
    for (const text of CONSENT_BUTTON_TEXTS) {
      const button = page.getByRole('button', { name: text, exact: false }).first();
      if (await button.isVisible({ timeout: 300 }).catch(() => false)) {
        log(`consent: clicking "${text}"`);
        await button.click().catch(() => undefined);
        clicked = true;
        break;
      }
    }
    if (!clicked && !onConsentPage) return;
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1500);
  }
}

async function openPlacePanel(page, timeout, allowLimited) {
  await page.locator('div[role="main"]').first().waitFor({ state: 'visible', timeout });
  const firstResult = page.locator('div[role="feed"] a[href*="/maps/place/"]').first();
  if (await firstResult.isVisible({ timeout: 3000 }).catch(() => false)) {
    log('results list shown, opening the first result');
    await firstResult.click();
  }
  const heading = page.locator('h1').first();
  if (!(await heading.isVisible({ timeout: 10_000 }).catch(() => false))) {
    throw new RetryableError('No place panel found (no h1 rendered)');
  }
  const diagnostic = await page.evaluate((source) => {
    const text = document.body.innerText;
    const match = new RegExp(`.{0,60}(?:${source}).{0,60}`, 'i').exec(text);
    const containers = new Set(
      Array.from(document.querySelectorAll('div[role="main"] [data-review-id]')).map((el) =>
        el.getAttribute('data-review-id'),
      ),
    ).size;
    return { banner: match ? match[0].replace(/\s+/g, ' ') : null, containers };
  }, LIMITED_VIEW_PATTERN.source);
  log(
    `page: ${diagnostic.containers} review containers rendered${diagnostic.banner ? `; banner "${diagnostic.banner}"` : ''}`,
  );
  if (diagnostic.banner !== null) {
    if (!allowLimited) throw new RetryableError('limited view served');
    log('continuing on the limited view (--allow-limited): expect only a few reviews');
  }
  return diagnostic.banner !== null;
}

async function removeProfile(dir) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rm(dir, { recursive: true, force: true });
      return;
    } catch {
      await sleep(500);
    }
  }
  log(`warning: temporary profile ${dir} could not be removed`);
}

/** Launches a persistent profile with the extension and opens the place. */
async function openPlace(args, targetUrl) {
  const profileDir = await mkdtemp(join(tmpdir(), 'signalyze-live-'));
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: !args.headed,
    ...(args.executable ? { executablePath: args.executable } : { channel: args.channel }),
    args: [
      `--disable-extensions-except=${EXTENSION_DIR}`,
      `--load-extension=${EXTENSION_DIR}`,
      `--lang=${args.hl}`,
      '--disable-blink-features=AutomationControlled',
    ],
    locale: args.hl,
    viewport: { width: 1400, height: 900 },
  });
  const close = async () => {
    await context.close().catch(() => undefined);
    await removeProfile(profileDir);
  };
  try {
    await context.addCookies(
      ['.google.com'].flatMap((domain) => [
        { name: 'CONSENT', value: 'YES+cb.20210720-07-p0.en+FX+410', domain, path: '/' },
        { name: 'SOCS', value: 'CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg', domain, path: '/' },
      ]),
    );
    let worker = context.serviceWorkers()[0];
    if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 15_000 });
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(`https://www.google.com/?hl=${args.hl}`, {
      waitUntil: 'domcontentloaded',
      timeout: args.timeout,
    });
    await dismissConsent(page);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: args.timeout });
    await dismissConsent(page);
    const limited = await openPlacePanel(page, args.timeout, args.allowLimited);
    // Give the content script a moment to read the header after the SPA navigation.
    await page.waitForTimeout(1500);
    return { context, page, worker, close, limited };
  } catch (error) {
    await close();
    throw error;
  }
}

/** The Maps tab id as seen by the extension (host permissions expose the url). */
async function findMapsTab(worker) {
  const tabs = await worker.evaluate((urls) => chrome.tabs.query({ url: urls }), MAPS_TAB_URLS);
  const tab = tabs.find((t) => /\/maps\/place\//.test(t.url ?? '')) ?? tabs[0];
  if (!tab) throw new RetryableError('the extension sees no Google Maps tab');
  return tab.id;
}

function sendToTab(worker, tabId, message) {
  return worker.evaluate(({ id, msg }) => chrome.tabs.sendMessage(id, msg), {
    id: tabId,
    msg: message,
  });
}

/** Independent read of the page: star histogram over the rendered review containers. */
function readHistogram(page) {
  return page.evaluate(() => {
    const hist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let containers = 0;
    const all = Array.from(document.querySelectorAll('div[role="main"] [data-review-id]'));
    for (const el of all) {
      if (el.tagName === 'BUTTON' || el.parentElement?.closest('[data-review-id]')) continue;
      containers += 1;
      const star = Array.from(el.querySelectorAll('[role="img"][aria-label]')).find((img) =>
        /^\s*[1-5]\b/.test(img.getAttribute('aria-label') ?? ''),
      );
      const digit = star ? /^\s*([1-5])/.exec(star.getAttribute('aria-label') ?? '')?.[1] : null;
      if (digit) hist[digit] += 1;
    }
    return { hist, containers };
  });
}

function histogramOf(reviews) {
  const hist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) hist[r.rating] += 1;
  return hist;
}

function band(score) {
  if (score < 20) return 'typical';
  if (score < 40) return 'some';
  if (score < 60) return 'many';
  return 'most';
}

function contributions(signals) {
  let weightSum = 0;
  for (const s of signals) if (s.available) weightSum += WEIGHTS[s.id];
  if (weightSum === 0) return [];
  return signals
    .filter((s) => s.available)
    .map((s) => ({
      id: s.id,
      points: Math.floor((100 * WEIGHTS[s.id] * s.unusualness) / weightSum + 0.5),
    }))
    .filter((c) => c.points > 0)
    .sort((a, b) => b.points - a.points);
}

function slugOf(name) {
  return (
    (name ?? 'place')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'place'
  );
}

function pad(value, width) {
  return String(value).padEnd(width);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(join(EXTENSION_DIR, 'manifest.json'))) {
    throw new Error(
      `no build at ${EXTENSION_DIR}; run "pnpm --filter @signalyze/extension build" first`,
    );
  }
  const targetUrl = withLanguage(args.url, args.hl);
  const limit = resolveLimit(args.limit);
  const minDate = windowStart(args.window, new Date());
  log(
    `opening ${targetUrl} (${args.headed ? 'headed' : 'headless'}, ${args.executable ?? args.channel})`,
  );
  log(
    `scope: ${args.limit} reviews (ceiling ${ALL_REVIEWS_CEILING}), window ${args.window}${minDate ? ` from ${minDate}` : ''}`,
  );

  let session = null;
  for (let attempt = 1; session === null; attempt += 1) {
    try {
      session = await openPlace(args, targetUrl);
    } catch (error) {
      if (!(error instanceof RetryableError) || attempt >= MAX_ATTEMPTS) throw error;
      const backoffMs = attempt * 10_000;
      log(
        `${error.message}; retrying with a fresh profile in ${backoffMs / 1000}s (${attempt}/${MAX_ATTEMPTS})`,
      );
      await sleep(backoffMs);
    }
  }

  const failures = [];
  try {
    const { page, worker } = session;
    if (session.limited)
      log('note: Google served its limited view; counts below are not the full history');
    const tabId = await findMapsTab(worker);
    const info = await sendToTab(worker, tabId, { type: 'GET_PLACE_CONTEXT' });
    if (!info?.layoutSupported)
      throw new Error(`layout not supported: ${JSON.stringify(info?.layout)}`);
    if (!info.context) throw new Error('the content script found no place on the page');
    const place = info.context;
    log(
      `place: ${place.name ?? '(no name)'} · ${place.overallRating ?? '?'} ★ · ${place.totalReviewCount ?? '?'} reviews · ${place.placeId}`,
    );

    const started = Date.now();
    const collected = await sendToTab(worker, tabId, { type: 'COLLECT_REVIEWS', limit, minDate });
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    log(
      `collection: status ${collected.status}, ${collected.collected} read, ${collected.dropped} dropped, newest order ${collected.sortedByNewest ? 'yes' : 'no'}, ${seconds}s`,
    );
    if (!collected.request)
      throw new Error(`collection returned no request (status ${collected.status})`);
    const request = collected.request;

    // Independent cross-check of what the adapter read, straight from the DOM.
    const dom = await readHistogram(page);
    const loadedHist = histogramOf(request.reviews);
    const domTotal = Object.values(dom.hist).reduce((a, b) => a + b, 0);
    const loadedTotal = request.reviews.length;
    const histOk =
      domTotal === loadedTotal
        ? [1, 2, 3, 4, 5].every((k) => dom.hist[k] === loadedHist[k])
        : [1, 2, 3, 4, 5].every((k) => dom.hist[k] <= loadedHist[k]);
    log(
      `histogram (page → adapter): ${JSON.stringify(dom.hist)} → ${JSON.stringify(loadedHist)}; page holds ${dom.containers} containers, adapter read ${loadedTotal} → ${histOk ? 'OK' : 'MISMATCH'}`,
    );
    if (!histOk) failures.push('histogram mismatch between the page and the adapter');

    const reviews =
      minDate === null ? request.reviews : request.reviews.filter((r) => r.date >= minDate);
    log(`in window: ${reviews.length} of ${loadedTotal}`);
    if (reviews.length === 0) throw new Error('no reviews inside the requested window');

    const now = new Date();
    const a = analyze(reviews, { placeId: place.placeId, source: 'offline', now });
    const b = analyze([...reviews], { placeId: place.placeId, source: 'offline', now });
    const reversed = analyze([...reviews].reverse(), {
      placeId: place.placeId,
      source: 'offline',
      now,
    });
    const deterministic = JSON.stringify(a) === JSON.stringify(b);
    const orderFree =
      a.score === reversed.score &&
      JSON.stringify(a.signals.map((s) => s.unusualness)) ===
        JSON.stringify(reversed.signals.map((s) => s.unusualness));
    log(
      `determinism: same input twice ${deterministic ? 'identical' : 'DIFFERENT'}; reversed order ${orderFree ? 'same score and signals' : 'DIFFERENT'}`,
    );
    if (!deterministic) failures.push('engine output differs between two runs on the same input');
    if (!orderFree) failures.push('engine output depends on review order');

    log('');
    log(
      `engine ${ENGINE_VERSION} · ${a.reviewCount} reviews analysed (minimum for a score: ${MIN_REVIEWS_FOR_SCORE})`,
    );
    if (a.score === null) {
      log(`score: none (${a.status})`);
    } else {
      log(`score: ${a.score} / 100 · band ${band(a.score)}`);
      const top = contributions(a.signals);
      log(
        `contributors: ${top.length === 0 ? 'none' : top.map((c) => `${c.id} +${c.points}`).join(' · ')}`,
      );
      log('');
      log(`${pad('signal', 24)} ${pad('value', 8)} ${pad('distance', 9)} details`);
      for (const id of SIGNAL_IDS) {
        const s = a.signals.find((x) => x.id === id);
        if (!s) continue;
        const value = s.available ? `${Math.round(s.value * 100)}%` : 'n/a';
        const distance = s.available ? `${Math.round(s.unusualness * 100)}%` : '';
        const details = Object.entries(s.details)
          .filter(([k]) => !/^min|^windowDays$|^establishedLevel$|^shortTextChars$/.test(k))
          .map(
            ([k, v]) => `${k}=${typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(3) : v}`,
          )
          .join(' ');
        log(`${pad(id, 24)} ${pad(value, 8)} ${pad(distance, 9)} ${details}`);
      }
    }
    log('');
    log(`rating distribution: ${JSON.stringify(a.ratingDistribution)}`);
    log(
      `monthly span: ${a.monthly.length} months (${a.monthly[0]?.month ?? '-'} … ${a.monthly[a.monthly.length - 1]?.month ?? '-'})`,
    );

    await mkdir(args.out, { recursive: true });
    const stamp = now.toISOString().replace(/[:.]/g, '-');
    const base = join(args.out, `${slugOf(place.name)}-${args.window}-${stamp}`);
    await writeFile(
      `${base}.request.json`,
      `${JSON.stringify({ place, scope: { limit: args.limit, window: args.window, minDate }, collected: { status: collected.status, collected: collected.collected, dropped: collected.dropped, sortedByNewest: collected.sortedByNewest, seconds: Number(seconds) }, request }, null, 2)}\n`,
    );
    await writeFile(`${base}.result.json`, `${JSON.stringify(a, null, 2)}\n`);
    log(`wrote ${base}.request.json and .result.json`);
  } finally {
    await session.close();
  }

  if (failures.length > 0) {
    for (const f of failures) log(`FAIL: ${f}`);
    process.exit(1);
  }
  log('live check passed');
}

main().catch((error) => {
  console.error(`[live-check] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
