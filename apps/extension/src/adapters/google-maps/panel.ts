/**
 * Reviews tab, scroll container and the paced collection loop. Scrolling
 * happens at most once per interval (600 ms by default) and stops as soon as
 * the requested number of reviews is read, the list is exhausted, the caller
 * aborts, or the layout self-test fails.
 */
import { SCROLL_INTERVAL_MS } from '@signalyze/shared';
import type { RawReview } from './reviews';
import { readReviewEntries } from './reviews';
import { checkLayout, labelledReviewsTabs, rule } from './selectors';

export type CollectStatus = 'complete' | 'exhausted' | 'aborted' | 'unsupported_layout';

export interface CollectOptions {
  /** Maximum number of reviews to collect (200 default / 500 extended, decided by the caller). */
  limit: number;
  /** Delay between scrolls; never scrolls faster than this. Default 600 ms. */
  scrollIntervalMs?: number;
  onProgress?: (count: number) => void;
  signal?: AbortSignal;
  /** Reference time for relative dates; defaults to the current time. */
  now?: Date;
  /** Injectable for tests; defaults to setTimeout. */
  sleep?: (ms: number) => Promise<void>;
}

export interface CollectResult {
  reviews: RawReview[];
  status: CollectStatus;
}

/** Scrolls with no new review after which the list counts as exhausted (unless still loading). */
const STALE_SCROLLS_BEFORE_EXHAUSTED = 2;
/** Total loop time cap, as a multiple of limit * interval. */
const TIME_BUDGET_FACTOR = 3;
/** Intervals to wait for the first review to render after opening the Reviews tab. */
const RENDER_WAIT_INTERVALS = 5;
/** Upper bound on tabs clicked when no tab label is recognised. */
const MAX_PROBED_TABS = 4;
/** Intervals given to each probed tab to render its content. */
const PROBE_WAIT_INTERVALS = 2;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isScrollable(el: Element, view: Window | null): boolean {
  if (!view) return false;
  const overflowY = view.getComputedStyle(el).overflowY;
  return /(auto|scroll)/.test(overflowY) && el.scrollHeight > el.clientHeight;
}

/**
 * Nearest scrollable ancestor of the review list. When computed styles carry
 * no overflow information (e.g. stylesheets stripped), falls back to the
 * nearest focusable (tabindex="-1") ancestor and finally the main panel.
 */
export function findScrollPanel(doc: Document): HTMLElement | null {
  const first = rule('reviewContainer').find(doc)[0];
  if (!first) return null;
  for (let el = first.parentElement; el; el = el.parentElement) {
    if (isScrollable(el, doc.defaultView)) return el;
  }
  const focusable = first.parentElement?.closest<HTMLElement>('[tabindex="-1"]') ?? null;
  const main = rule('mainPanel').find(doc)[0] ?? null;
  return focusable ?? (main instanceof HTMLElement ? main : null);
}

/** The Reviews tab identified by its label in one of the known UI languages, or null. */
export function findReviewsTab(doc: Document): HTMLElement | null {
  const tab = labelledReviewsTabs(doc)[0];
  return tab instanceof HTMLElement ? tab : null;
}

/**
 * Language-independent fallback when no tab label is recognised: clicks up to
 * MAX_PROBED_TABS tabs in order, gives each up to PROBE_WAIT_INTERVALS
 * intervals to render, and keeps the tab that renders the most review
 * containers (the Overview tab shows a few review snippets, the Reviews tab a
 * longer list; ties go to the first). Leaves that tab selected. Returns null
 * when no tab renders any review container or the caller aborted.
 */
async function probeReviewsTab(
  doc: Document,
  wait: () => Promise<void>,
  aborted: () => boolean,
): Promise<HTMLElement | null> {
  const tabs = rule('panelTabs')
    .find(doc)
    .filter((el): el is HTMLElement => el instanceof HTMLElement)
    .slice(0, MAX_PROBED_TABS);
  let best: { tab: HTMLElement; count: number } | null = null;
  let lastClicked: HTMLElement | null = null;
  for (const tab of tabs) {
    if (aborted()) return null;
    tab.click();
    lastClicked = tab;
    let count = 0;
    for (let i = 0; i < PROBE_WAIT_INTERVALS && count === 0; i += 1) {
      await wait();
      count = rule('reviewContainer').find(doc).length;
    }
    if (count > 0 && (best === null || count > best.count)) best = { tab, count };
  }
  if (best === null || aborted()) return null;
  if (best.tab !== lastClicked) {
    best.tab.click();
    await wait();
  }
  return best.tab;
}

/** Clicks every "More" button inside the rendered reviews so full texts are readable. */
export function expandTruncatedTexts(doc: Document): number {
  let clicked = 0;
  for (const container of rule('reviewContainer').find(doc)) {
    for (const button of rule('reviewExpandButton').find(container)) {
      if (button instanceof HTMLElement) {
        button.click();
        clicked += 1;
      }
    }
  }
  return clicked;
}

export async function collectReviews(
  doc: Document,
  options: CollectOptions,
): Promise<CollectResult> {
  const interval = Math.max(1, options.scrollIntervalMs ?? SCROLL_INTERVAL_MS);
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? new Date();
  const limit = Math.max(1, Math.floor(options.limit));
  const timeBudgetMs = limit * interval * TIME_BUDGET_FACTOR;
  const collected = new Map<string, RawReview>();
  let elapsedMs = 0;

  const aborted = (): boolean => options.signal?.aborted === true;
  const finish = (status: CollectStatus): CollectResult => ({
    reviews: Array.from(collected.values()).slice(0, limit),
    status,
  });
  const wait = async (): Promise<void> => {
    await sleep(interval);
    elapsedMs += interval;
  };

  if (aborted()) return finish('aborted');
  const labelled = findReviewsTab(doc);
  if (labelled) {
    if (labelled.getAttribute('aria-selected') !== 'true') {
      labelled.click();
      await wait();
    }
  } else {
    const probed = await probeReviewsTab(doc, wait, aborted);
    if (aborted()) return finish('aborted');
    if (!probed) return finish('unsupported_layout');
  }
  // The list renders asynchronously after the tab opens: poll a few intervals for it.
  for (
    let i = 0;
    i < RENDER_WAIT_INTERVALS && rule('reviewContainer').find(doc).length === 0;
    i += 1
  ) {
    await wait();
  }
  const panel = findScrollPanel(doc);
  if (!panel || !checkLayout(doc).ok) return finish('unsupported_layout');

  let staleScrolls = 0;
  for (;;) {
    if (aborted()) return finish('aborted');
    expandTruncatedTexts(doc);
    const before = collected.size;
    for (const { id, review } of readReviewEntries(doc, now).entries) {
      if (!collected.has(id)) collected.set(id, review);
    }
    options.onProgress?.(collected.size);
    if (collected.size >= limit) return finish('complete');

    staleScrolls = collected.size > before ? 0 : staleScrolls + 1;
    const loading = rule('loadingIndicator').find(doc).length > 0;
    if (staleScrolls >= STALE_SCROLLS_BEFORE_EXHAUSTED && !loading) return finish('exhausted');
    if (elapsedMs >= timeBudgetMs) return finish('exhausted');

    panel.scrollTop = panel.scrollHeight;
    await wait();
    if (aborted()) return finish('aborted');
    if (!checkLayout(doc).ok) return finish('unsupported_layout');
  }
}
