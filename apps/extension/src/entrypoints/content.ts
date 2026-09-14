/**
 * Content script for Google Maps place pages. It never analyzes on its own:
 * it answers the side panel's requests, reads reviews only when asked,
 * hashes reviewer ids before anything leaves the page and keeps the on-page
 * badge in sync. Every DOM access goes through the adapter folder.
 */
import { ALL_REVIEWS_CEILING, SCROLL_INTERVAL_MS } from '@signalyze/shared';
import { browser } from 'wxt/browser';
import {
  RULES,
  checkLayout,
  collectReviews,
  readPlaceContext,
  type LayoutCheck,
  type PlaceContext,
} from '@/adapters/google-maps';
import {
  mountBadge,
  type BadgeHandle,
  type BadgeLabels,
  type BadgeStatus,
} from '@/adapters/google-maps/badge';
import { resolveLocale, translate } from '@/i18n';
import {
  isTabMessage,
  sendToRuntime,
  type AckResponse,
  type CollectReviewsResponse,
  type PlaceContextResponse,
  type SetBadgeMessage,
  type TabMessage,
} from '@/lib/messages';
import { buildAnalysisRequest } from '@/lib/privacy';
import {
  DEFAULT_SETTINGS,
  getCachedResult,
  getSettings,
  onSettingsChanged,
  type Settings,
} from '@/lib/storage';

const URL_POLL_MS = 750;

/** Required rules evaluated on the document; missing ones mean the layout changed. */
const DOCUMENT_RULES = new Set(
  RULES.filter((item) => item.required && item.scope === 'document').map((item) => item.name),
);

function layoutSupported(layout: LayoutCheck): boolean {
  return layout.ok || !layout.missing.some((name) => DOCUMENT_RULES.has(name));
}

function ignore(): void {
  // Best-effort notifications: nobody may be listening.
}

export default defineContentScript({
  matches: ['https://www.google.com/maps*', 'https://maps.google.com/*'],
  runAt: 'document_idle',
  main(ctx) {
    let settings: Settings = DEFAULT_SETTINGS;
    let context: PlaceContext | null = null;
    let layout: LayoutCheck = { ok: true };
    let badge: BadgeHandle | null = null;
    let badgeStatus: BadgeStatus = { state: 'idle' };
    let collecting: AbortController | null = null;
    let lastUrl = '';
    const clientVersion = browser.runtime.getManifest().version;

    const badgeLabels = (): BadgeLabels => {
      const locale = resolveLocale(settings);
      return {
        brand: translate(locale, 'badge.idle'),
        title: translate(locale, 'badge.title'),
        loading: translate(locale, 'badge.loading'),
        insufficient: translate(locale, 'badge.na'),
      };
    };

    const openSidePanel = (): void => {
      sendToRuntime({ type: 'OPEN_SIDE_PANEL' }).catch(ignore);
    };

    const unmountBadge = (): void => {
      badge?.unmount();
      badge = null;
    };

    const mountIfPossible = (): void => {
      if (badge !== null) return;
      badge = mountBadge(document, {
        onClick: openSidePanel,
        labels: badgeLabels(),
        initial: badgeStatus,
      });
    };

    const setBadge = (status: BadgeStatus): void => {
      badgeStatus = status;
      badge?.update(status);
    };

    const statusForScore = (score: number | null): BadgeStatus =>
      score === null ? { state: 'insufficient' } : { state: 'done', score };

    /** Shows the cached score (or idle) for the current place, unless a collection is running. */
    const syncBadge = async (): Promise<void> => {
      if (context === null || !settings.badgeEnabled || !layoutSupported(layout)) {
        unmountBadge();
        return;
      }
      if (collecting === null) {
        const cached = await getCachedResult(context.placeId);
        badgeStatus = cached ? statusForScore(cached.result.score) : { state: 'idle' };
      }
      if (badge === null) mountIfPossible();
      else badge.update(badgeStatus);
    };

    const refresh = async (): Promise<void> => {
      try {
        lastUrl = location.href;
        context = readPlaceContext(document, location.href);
        layout = checkLayout(document);
        await syncBadge();
      } catch {
        // Non-place pages and transient DOM states are ignored on purpose.
      }
    };

    const collect = async (
      limit: number,
      minDate: string | null,
    ): Promise<CollectReviewsResponse> => {
      const empty = (status: CollectReviewsResponse['status']): CollectReviewsResponse => ({
        status,
        request: null,
        collected: 0,
        dropped: 0,
        sortedByNewest: false,
      });
      const current = readPlaceContext(document, location.href) ?? context;
      if (current === null) return empty('no_place');
      context = current;
      collecting?.abort();
      const controller = new AbortController();
      collecting = controller;
      setBadge({ state: 'loading' });
      const bounded = Math.min(Math.max(1, Math.floor(limit)), ALL_REVIEWS_CEILING);
      let success = false;
      try {
        const result = await collectReviews(document, {
          limit: bounded,
          minDate,
          scrollIntervalMs: SCROLL_INTERVAL_MS,
          signal: controller.signal,
          onProgress: (count) => {
            sendToRuntime({ type: 'COLLECT_PROGRESS', count, limit: bounded }).catch(ignore);
          },
        });
        if (result.status === 'unsupported_layout') {
          setBadge({ state: 'unsupported' });
          success = true;
          return empty('unsupported_layout');
        }
        if (result.status === 'aborted') {
          return {
            status: 'aborted',
            request: null,
            collected: result.reviews.length,
            dropped: 0,
            sortedByNewest: result.sortedByNewest,
          };
        }
        const built = await buildAnalysisRequest(
          current,
          result.reviews,
          resolveLocale(settings),
          clientVersion,
        );
        // The side panel reports the score through SET_BADGE once the analysis is done.
        success = built.request !== null;
        return {
          status: result.status,
          request: built.request,
          collected: result.reviews.length,
          dropped: built.dropped,
          sortedByNewest: result.sortedByNewest,
        };
      } catch {
        return empty('error');
      } finally {
        if (collecting === controller) {
          collecting = null;
          if (!success) void syncBadge();
        }
      }
    };

    const applyBadgeMessage = (message: SetBadgeMessage): void => {
      if (message.state === 'done') setBadge(statusForScore(message.score));
      else setBadge({ state: message.state });
      // "idle" means "show whatever the cache has for this place".
      if (message.state === 'idle') void syncBadge();
    };

    const handle = async (
      message: TabMessage,
    ): Promise<PlaceContextResponse | CollectReviewsResponse | AckResponse> => {
      switch (message.type) {
        case 'GET_PLACE_CONTEXT':
          await refresh();
          return { context, layout, layoutSupported: layoutSupported(layout) };
        case 'COLLECT_REVIEWS':
          return collect(message.limit, message.minDate);
        case 'CANCEL_COLLECT': {
          const active = collecting !== null;
          collecting?.abort();
          return { ok: active };
        }
        case 'SET_BADGE':
          applyBadgeMessage(message);
          return { ok: true };
      }
    };

    browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
      if (!isTabMessage(message)) return false;
      handle(message).then(
        (response) => {
          sendResponse(response);
        },
        () => {
          sendResponse(null);
        },
      );
      return true;
    });

    const stopSettings = onSettingsChanged((next) => {
      settings = next;
      unmountBadge();
      void syncBadge();
    });

    ctx.onInvalidated(() => {
      stopSettings();
      collecting?.abort();
      unmountBadge();
    });

    ctx.setInterval(() => {
      if (location.href !== lastUrl) {
        void refresh();
        return;
      }
      // The header may render after document_idle; keep trying to place the badge.
      if (context !== null && badge === null && settings.badgeEnabled && layoutSupported(layout)) {
        mountIfPossible();
      }
    }, URL_POLL_MS);
    ctx.addEventListener(window, 'popstate', () => {
      void refresh();
    });

    getSettings()
      .then((loaded) => {
        settings = loaded;
      })
      .catch(ignore)
      .then(refresh)
      .catch(ignore);
  },
});
