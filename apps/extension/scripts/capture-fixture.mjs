#!/usr/bin/env node
/* eslint-disable no-restricted-syntax -- Playwright capture tool, not extension code: it runs DOM queries inside the browser page to save a fixture. */
/**
 * Captures an anonymised Google Maps place panel as a test fixture for the
 * Google Maps adapter (apps/extension/src/adapters/google-maps).
 *
 * Usage:
 *   node apps/extension/scripts/capture-fixture.mjs "<google maps place url>" <slug> \
 *     [--reviews 40] [--hl en] [--headed] [--channel chrome|msedge|chromium] \
 *     [--executable <chrome.exe>] [--timeout 90000]
 *
 * Output (relative to apps/extension/src/adapters/google-maps/fixtures/):
 *   <slug>.html       outerHTML of the place panel, anonymised (see anonymisePanel)
 *   <slug>.meta.json  { url, capturedAt, hl, reviewCountLoaded, businessNameReplaced, ... }
 *
 * Google serves sessions that look automated or cookie-less a "limited view"
 * (a handful of reviews, no paging, no Reviews tab at times). A regular Chrome
 * build (`--channel chrome`, the default) running a fresh persistent profile
 * with a warm-up visit to google.com receives the full page; when the limited
 * view is detected anyway the script retries with a new profile. `--headed`
 * is the most reliable mode on a desktop session.
 *
 * The page is read at a human-like pace (one scroll per 600 ms). Only the DOM
 * Google already rendered in the browser is read; nothing is fetched separately.
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const FIXTURE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'adapters',
  'google-maps',
  'fixtures',
);
const SCROLL_INTERVAL_MS = 600;
const MAX_FIXTURE_BYTES = 1.5 * 1024 * 1024;
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
const REVIEWS_TAB_PATTERN = /review|yorum|rezension|bewertung|reseña|opinion/i;
/** Banner Google shows on its signed-out "limited view" page, in the supported UI languages. */
const LIMITED_VIEW_PATTERN =
  /limited view|sınırlı (bir )?görünüm|eingeschränkte Ansicht|vista limitada/i;
/** The limited view renders this many reviews and never pages; the full page starts at 10. */
const LIMITED_VIEW_REVIEW_CAP = 5;

/** A failure worth retrying with a fresh browser profile. */
class RetryableError extends Error {}

function parseArgs(argv) {
  const positional = [];
  const options = {
    reviews: 40,
    hl: 'en',
    headed: false,
    timeout: 90_000,
    // Playwright browser channel ("chrome", "msedge", "chromium").
    channel: 'chrome',
    // Optional Chromium binary; wins over --channel when given.
    executable: process.env.SIGNALYZE_CHROMIUM_EXECUTABLE ?? null,
    // Optional persistent profile directory to reuse across captures (kept on disk). A
    // session that once received the full page tends to keep it; retries use a temp profile.
    profile: process.env.SIGNALYZE_CAPTURE_PROFILE ?? null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--headed') options.headed = true;
    else if (arg === '--profile') options.profile = String(argv[++i]);
    else if (arg === '--reviews') options.reviews = Number(argv[++i]);
    else if (arg === '--hl') options.hl = String(argv[++i]);
    else if (arg === '--timeout') options.timeout = Number(argv[++i]);
    else if (arg === '--channel') options.channel = String(argv[++i]);
    else if (arg === '--executable') options.executable = String(argv[++i]);
    else if (arg.startsWith('--')) throw new Error(`Unknown option ${arg}`);
    else positional.push(arg);
  }
  const [url, slug] = positional;
  if (!url || !slug) {
    throw new Error(
      'Usage: capture-fixture.mjs "<google maps place url>" <slug> [--reviews 40] [--hl en] [--headed] [--channel chrome] [--executable <chrome.exe>]',
    );
  }
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('slug must match /^[a-z0-9-]+$/');
  if (!Number.isInteger(options.reviews) || options.reviews < 1) {
    throw new Error('--reviews must be a positive integer');
  }
  return { url, slug, ...options };
}

function withLanguage(url, hl) {
  const parsed = new URL(url);
  parsed.searchParams.set('hl', hl);
  return parsed.toString();
}

function log(message) {
  process.stdout.write(`[capture] ${message}\n`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function openPlacePanel(page, timeout) {
  await page.locator('div[role="main"]').first().waitFor({ state: 'visible', timeout });
  // A search-style URL may show a results list instead: open the first result.
  const firstResult = page.locator('div[role="feed"] a[href*="/maps/place/"]').first();
  if (await firstResult.isVisible({ timeout: 3000 }).catch(() => false)) {
    log('results list shown, opening the first result');
    await firstResult.click();
  }
  const heading = page.locator('h1').first();
  if (!(await heading.isVisible({ timeout: 10_000 }).catch(() => false))) {
    throw new RetryableError('No place panel found (no h1 rendered)');
  }
}

async function openReviewsTab(page, timeout) {
  const state = await page.evaluate((patternSource) => {
    const pattern = new RegExp(patternSource, 'i');
    const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
    const tab = tabs.find((el) =>
      pattern.test(`${el.getAttribute('aria-label') ?? ''} ${el.textContent ?? ''}`),
    );
    if (!tab) return 'missing';
    if (tab.getAttribute('aria-selected') === 'true') return 'already-open';
    tab.click();
    return 'clicked';
  }, REVIEWS_TAB_PATTERN.source);
  const limited = await page.evaluate(
    (source) => new RegExp(source, 'i').test(document.body.innerText),
    LIMITED_VIEW_PATTERN.source,
  );
  if (state === 'missing' || limited) {
    throw new RetryableError(limited ? 'limited view served' : 'Reviews tab not found');
  }
  log(`reviews tab: ${state}`);
  await page
    .locator('div[role="main"] [data-review-id]')
    .first()
    .waitFor({ state: 'visible', timeout });
}

/**
 * Behavioural limited-view check, independent of the banner language: the
 * limited page renders at most five reviews and ignores scrolling.
 */
async function assertReviewsPage(page) {
  await page.waitForTimeout(1500);
  let count = await countReviews(page);
  for (let round = 0; round < 3 && count <= LIMITED_VIEW_REVIEW_CAP; round += 1) {
    await scrollReviewList(page);
    await page.waitForTimeout(SCROLL_INTERVAL_MS * 2);
    count = await countReviews(page);
  }
  if (count <= LIMITED_VIEW_REVIEW_CAP) {
    throw new RetryableError(`review list does not page (${count} reviews); limited view`);
  }
}

function countReviews(page) {
  return page.evaluate(() => {
    const ids = new Set();
    for (const el of document.querySelectorAll('div[role="main"] [data-review-id]')) {
      ids.add(el.getAttribute('data-review-id'));
    }
    return ids.size;
  });
}

async function expandTruncatedTexts(page) {
  for (let pass = 0; pass < 3; pass += 1) {
    const clicked = await page.evaluate(() => {
      let n = 0;
      const buttons = document.querySelectorAll(
        'div[role="main"] [data-review-id] button[aria-expanded="false"]',
      );
      for (const button of buttons) {
        button.click();
        n += 1;
      }
      return n;
    });
    if (clicked === 0) break;
    log(`expanded ${clicked} truncated text(s)`);
    await page.waitForTimeout(500);
  }
}

/** Scrolls the nearest scrollable ancestor of the review list to its bottom. */
function scrollReviewList(page) {
  return page.evaluate(() => {
    const first = document.querySelector('div[role="main"] [data-review-id]');
    let el = first?.parentElement ?? null;
    while (el) {
      const style = getComputedStyle(el);
      if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight) break;
      el = el.parentElement;
    }
    if (!el) return false;
    el.scrollTop = el.scrollHeight;
    return true;
  });
}

async function scrollUntil(page, target) {
  let count = await countReviews(page);
  let stalled = 0;
  const maxRounds = Math.ceil(target / 5) + 30;
  for (let round = 0; round < maxRounds && count < target; round += 1) {
    await scrollReviewList(page);
    await page.waitForTimeout(SCROLL_INTERVAL_MS);
    const next = await countReviews(page);
    if (next > count) {
      stalled = 0;
      count = next;
      log(`loaded ${count} reviews`);
    } else {
      stalled += 1;
      if (stalled >= 10) {
        log('no new reviews after 10 scrolls, stopping');
        break;
      }
    }
  }
  return count;
}

/**
 * Runs inside the page: clones the panel and replaces everything that
 * identifies a person or the business with stable placeholders.
 */
function anonymisePanel({ slug, limitedPattern }) {
  const main = document.querySelector('div[role="main"]');
  if (!main) throw new Error('div[role="main"] missing');
  // Save the nearest ancestor holding both the place header (h1) and the review
  // list when the header is rendered outside the main panel.
  const h1 = document.querySelector('h1');
  let root = main;
  if (h1 && !main.contains(h1)) {
    while (root.parentElement && root.parentElement !== document.body && !root.contains(h1)) {
      root = root.parentElement;
    }
    if (!root.contains(h1)) root = main;
  }
  const clone = root.cloneNode(true);
  const limitedView = new RegExp(limitedPattern, 'i').test(document.body.innerText);
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const boundary = (s) =>
    new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(s)}(?![\\p{L}\\p{N}])`, 'gu');

  for (const el of clone.querySelectorAll('script, style, link, noscript, template')) el.remove();
  for (const svg of clone.querySelectorAll('svg')) svg.replaceChildren();

  const businessName = (h1?.textContent ?? main.getAttribute('aria-label') ?? '').trim();
  const containers = Array.from(clone.querySelectorAll('[data-review-id]')).filter(
    (el) => !el.parentElement?.closest('[data-review-id]'),
  );

  const reviewIdMap = new Map();
  const reviewerIndexByContrib = new Map();
  const nameMap = new Map();
  let nextReviewer = 1;
  for (const container of containers) {
    const name = (container.getAttribute('aria-label') ?? '').trim();
    const link = container.querySelector(
      '[data-href*="/maps/contrib/"], a[href*="/maps/contrib/"]',
    );
    const linkValue = link?.getAttribute('data-href') ?? link?.getAttribute('href') ?? '';
    const contribId = /\/maps\/contrib\/(\d+)/.exec(linkValue)?.[1] ?? `name:${name}`;
    let index = reviewerIndexByContrib.get(contribId);
    if (index === undefined) {
      index = nextReviewer;
      nextReviewer += 1;
      reviewerIndexByContrib.set(contribId, index);
    }
    if (name.length >= 1 && !nameMap.has(name)) nameMap.set(name, `Reviewer ${index}`);
  }

  const replacements = Array.from(nameMap.entries())
    .sort((a, b) => b[0].length - a[0].length)
    .map(([name, placeholder]) => ({ regex: boundary(name), placeholder }));
  if (businessName.length >= 2) {
    replacements.push({ regex: boundary(businessName), placeholder: `Business ${slug}` });
  }
  const replaceText = (value) => {
    let out = value;
    for (const { regex, placeholder } of replacements) out = out.replace(regex, placeholder);
    return out;
  };

  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  for (const node of textNodes) node.nodeValue = replaceText(node.nodeValue ?? '');

  const looksLikeId = (value) => /\d{12,}/.test(value) || /^[A-Za-z0-9_=-]{24,}$/.test(value);
  const elements = [clone, ...clone.querySelectorAll('*')];
  for (const el of elements) {
    for (const attr of Array.from(el.attributes)) {
      const { name, value } = attr;
      if (name === 'data-review-id') {
        let mapped = reviewIdMap.get(value);
        if (!mapped) {
          mapped = `review-${reviewIdMap.size + 1}`;
          reviewIdMap.set(value, mapped);
        }
        el.setAttribute(name, mapped);
        continue;
      }
      if (name === 'src' || name === 'srcset') {
        el.setAttribute(name, '');
        continue;
      }
      if (name === 'href' || name === 'data-href') {
        const contribId = /\/maps\/contrib\/(\d+)/.exec(value)?.[1];
        if (contribId) {
          const index = reviewerIndexByContrib.get(contribId) ?? 0;
          el.setAttribute(name, `https://www.google.com/maps/contrib/${index}`);
          continue;
        }
      }
      if (/^(jsaction|jslog|jsdata|jsmodel|jscontroller|jsname|ved|data-ved)$/.test(name)) {
        el.removeAttribute(name);
        continue;
      }
      if (name.startsWith('data-') && name !== 'data-photo-index' && looksLikeId(value)) {
        el.removeAttribute(name);
        continue;
      }
      if (name === 'style' && value.includes('url(')) {
        el.setAttribute(name, value.replace(/url\((['"]?)[^)]*\1\)/g, 'url()'));
        continue;
      }
      const replaced = replaceText(value);
      if (replaced !== value) el.setAttribute(name, replaced);
    }
  }

  return {
    html: clone.outerHTML,
    businessName,
    reviewCount: containers.length,
    reviewerCount: reviewerIndexByContrib.size,
    headerIncluded: Boolean(h1 && clone.querySelector('h1')),
    limitedView,
  };
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

/** Launches a persistent profile and opens the place with its Reviews tab active. */
async function openPlace(args, targetUrl, reuseProfile) {
  const profileDir = reuseProfile ?? (await mkdtemp(join(tmpdir(), 'signalyze-capture-')));
  if (reuseProfile) await mkdir(profileDir, { recursive: true });
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: !args.headed,
    ...(args.executable ? { executablePath: args.executable } : { channel: args.channel }),
    args: [`--lang=${args.hl}`, '--disable-blink-features=AutomationControlled'],
    locale: args.hl,
    viewport: { width: 1400, height: 900 },
  });
  const close = async () => {
    await context.close().catch(() => undefined);
    if (!reuseProfile) await removeProfile(profileDir);
  };
  try {
    const host = new URL(targetUrl).hostname.replace(/^(www|maps)\./, '');
    await context.addCookies(
      Array.from(new Set(['.google.com', `.${host}`])).flatMap((domain) => [
        { name: 'CONSENT', value: 'YES+cb.20210720-07-p0.en+FX+410', domain, path: '/' },
        { name: 'SOCS', value: 'CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg', domain, path: '/' },
      ]),
    );
    const page = context.pages()[0] ?? (await context.newPage());
    // Warm-up on the search home page establishes a normal session before Maps loads.
    await page.goto(`https://www.google.com/?hl=${args.hl}`, {
      waitUntil: 'domcontentloaded',
      timeout: args.timeout,
    });
    await dismissConsent(page);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: args.timeout });
    await dismissConsent(page);
    await openPlacePanel(page, args.timeout);
    await openReviewsTab(page, args.timeout);
    await assertReviewsPage(page);
    return { page, close };
  } catch (error) {
    await close();
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targetUrl = withLanguage(args.url, args.hl);
  log(
    `opening ${targetUrl} (${args.headed ? 'headed' : 'headless'}, ${args.executable ?? args.channel})`,
  );

  let session = null;
  for (let attempt = 1; session === null; attempt += 1) {
    try {
      // The reusable profile is tried first; retries always start from a fresh one.
      session = await openPlace(args, targetUrl, attempt === 1 ? args.profile : null);
    } catch (error) {
      if (!(error instanceof RetryableError) || attempt >= MAX_ATTEMPTS) throw error;
      const backoffMs = attempt * 10_000;
      log(
        `${error.message}; retrying with a fresh profile in ${backoffMs / 1000}s (${attempt}/${MAX_ATTEMPTS})`,
      );
      await sleep(backoffMs);
    }
  }

  try {
    const { page } = session;
    const loaded = await scrollUntil(page, args.reviews);
    await expandTruncatedTexts(page);
    const finalUrl = page.url();

    const result = await page.evaluate(anonymisePanel, {
      slug: args.slug,
      limitedPattern: LIMITED_VIEW_PATTERN.source,
    });
    const bytes = Buffer.byteLength(result.html, 'utf8');
    log(
      `panel captured: ${result.reviewCount} reviews, ${result.reviewerCount} reviewers, ${(bytes / 1024).toFixed(0)} KB, header ${result.headerIncluded ? 'included' : 'not rendered on the reviews page'}`,
    );
    if (bytes > MAX_FIXTURE_BYTES) {
      throw new Error(`Fixture is ${bytes} bytes; reduce --reviews to stay under 1.5 MB`);
    }
    if (loaded < args.reviews) {
      log(`warning: only ${loaded} of ${args.reviews} requested reviews were loaded`);
    }

    await mkdir(FIXTURE_DIR, { recursive: true });
    const htmlPath = join(FIXTURE_DIR, `${args.slug}.html`);
    const metaPath = join(FIXTURE_DIR, `${args.slug}.meta.json`);
    const meta = {
      url: finalUrl,
      capturedAt: new Date().toISOString(),
      hl: args.hl,
      reviewCountLoaded: result.reviewCount,
      reviewerCount: result.reviewerCount,
      businessNameReplaced: true,
      businessNamePlaceholder: `Business ${args.slug}`,
      headerIncluded: result.headerIncluded,
      // True when Google served its signed-out "limited view" (reviews capped, no paging).
      limitedView: result.limitedView,
    };
    await writeFile(htmlPath, `${result.html}\n`, 'utf8');
    await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
    log(`wrote ${htmlPath}`);
    log(`wrote ${metaPath}`);
  } finally {
    await session.close();
  }
}

main().catch((error) => {
  console.error(`[capture] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
