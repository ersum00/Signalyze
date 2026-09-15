/**
 * The side panel's state machine. Talks to the content script of the active
 * Google Maps tab, runs the analysis (remote or offline) and keeps the
 * on-page badge informed. Nothing here touches the page DOM.
 *
 * Scope: the number of reviews to load and the period to keep. A period is
 * applied after collection (the content script returns everything it read
 * in Newest order); windowed analyses run in the browser only and are cached
 * under their own key so the all-time profile and the badge stay untouched.
 */
import { resolveLimit, windowStart, type AnalysisResult } from '@signalyze/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { browser, type Browser } from 'wxt/browser';
import type { PlaceContext } from '@/adapters/google-maps';
import { runAnalysis } from '@/lib/analysis';
import {
  isRuntimeMessage,
  sendToTab,
  type BadgeState,
  type CollectOutcome,
  type CollectReviewsResponse,
  type PlaceContextResponse,
} from '@/lib/messages';
import { filterByWindow, type AnalysisScope } from '@/lib/scope';
import {
  DEFAULT_SETTINGS,
  getCachedResult,
  setCachedResult,
  type CachedResult,
  type Settings,
} from '@/lib/storage';
import { getActiveTab, isGoogleMapsUrl } from '@/lib/tabs';

export type Phase =
  | { kind: 'loading' }
  | { kind: 'no_tab' }
  | { kind: 'no_script' }
  | { kind: 'no_place' }
  | { kind: 'layout_changed' }
  | { kind: 'ready'; context: PlaceContext; cached: CachedResult | null; notice?: 'cancelled' }
  | { kind: 'collecting'; context: PlaceContext; count: number; scope: AnalysisScope }
  | { kind: 'analyzing'; context: PlaceContext; scope: AnalysisScope }
  | {
      kind: 'result';
      context: PlaceContext;
      result: AnalysisResult;
      fallbackReason: string | null;
      collectStatus: CollectOutcome | 'cached';
      scope: AnalysisScope;
      /** Whether the page was read in Google's Newest order (only attempted with a period). */
      sortedByNewest: boolean;
      /** Reviews read from the page before the period filter. */
      loaded: number;
    }
  | { kind: 'error'; context: PlaceContext; reason: 'collect' | 'analysis' }
  | { kind: 'empty_window'; context: PlaceContext; scope: AnalysisScope };

export interface AnalysisController {
  phase: Phase;
  analyze: (scope: AnalysisScope) => void;
  cancel: () => void;
  showCached: () => void;
  back: () => void;
}

const REFRESH_DEBOUNCE_MS = 400;

function ignore(): void {
  // The tab may have navigated away; nothing to do.
}

export function useAnalysis(settings: Settings | null): AnalysisController {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const phaseRef = useRef<Phase>(phase);
  const settingsRef = useRef<Settings | null>(settings);
  const tabIdRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const refresh = useCallback(async (keepResult = true): Promise<void> => {
    if (busyRef.current) return;
    const tab = await getActiveTab();
    if (busyRef.current) return;
    if (tab?.id === undefined || !isGoogleMapsUrl(tab.url)) {
      tabIdRef.current = null;
      setPhase({ kind: 'no_tab' });
      return;
    }
    tabIdRef.current = tab.id;
    let response: PlaceContextResponse | null = null;
    try {
      response = await sendToTab(tab.id, { type: 'GET_PLACE_CONTEXT' });
    } catch {
      response = null;
    }
    if (busyRef.current) return;
    if (response === null) {
      setPhase({ kind: 'no_script' });
      return;
    }
    if (!response.layoutSupported) {
      setPhase({ kind: 'layout_changed' });
      return;
    }
    const context = response.context;
    if (context === null) {
      setPhase({ kind: 'no_place' });
      return;
    }
    const cached = await getCachedResult(context.placeId);
    if (busyRef.current) return;
    setPhase((prev) => {
      // A result stays on screen while the same place is open (Maps changes
      // the URL when switching tabs inside the place).
      if (keepResult && prev.kind === 'result' && prev.context.placeId === context.placeId) {
        return prev;
      }
      return { kind: 'ready', context, cached };
    });
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void refresh();
    }, REFRESH_DEBOUNCE_MS);
  }, [refresh]);

  useEffect(() => {
    void refresh();
    const onUpdated = (_tabId: number, info: Browser.tabs.OnUpdatedInfo) => {
      if (info.url !== undefined || info.status === 'complete') scheduleRefresh();
    };
    const onActivated = () => {
      scheduleRefresh();
    };
    browser.tabs.onUpdated.addListener(onUpdated);
    browser.tabs.onActivated.addListener(onActivated);
    return () => {
      browser.tabs.onUpdated.removeListener(onUpdated);
      browser.tabs.onActivated.removeListener(onActivated);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [refresh, scheduleRefresh]);

  useEffect(() => {
    const onMessage = (message: unknown, sender: Browser.runtime.MessageSender) => {
      if (!isRuntimeMessage(message) || message.type !== 'COLLECT_PROGRESS') return;
      if (sender.tab?.id !== tabIdRef.current) return;
      setPhase((prev) => (prev.kind === 'collecting' ? { ...prev, count: message.count } : prev));
    };
    browser.runtime.onMessage.addListener(onMessage);
    return () => {
      browser.runtime.onMessage.removeListener(onMessage);
    };
  }, []);

  const analyze = useCallback((scope: AnalysisScope) => {
    const tabId = tabIdRef.current;
    const current = phaseRef.current;
    const context = 'context' in current ? current.context : null;
    if (tabId === null || context === null || busyRef.current) return;

    const setBadge = (score: number | null, state: BadgeState): void => {
      sendToTab(tabId, { type: 'SET_BADGE', score, state }).catch(ignore);
    };
    const fail = (reason: 'collect' | 'analysis'): void => {
      busyRef.current = false;
      setPhase({ kind: 'error', context, reason });
      setBadge(null, 'idle');
    };

    const limit = resolveLimit(scope.limit);
    const minDate = windowStart(scope.window, new Date());
    busyRef.current = true;
    setPhase({ kind: 'collecting', context, count: 0, scope });
    void (async () => {
      let response: CollectReviewsResponse | null = null;
      try {
        response = await sendToTab(tabId, { type: 'COLLECT_REVIEWS', limit, minDate });
      } catch {
        response = null;
      }
      if (response === null || response.status === 'error' || response.status === 'no_place') {
        fail('collect');
        return;
      }
      if (response.status === 'unsupported_layout') {
        busyRef.current = false;
        setPhase({ kind: 'layout_changed' });
        return;
      }
      if (response.status === 'aborted') {
        busyRef.current = false;
        const cached = await getCachedResult(context.placeId);
        setPhase({ kind: 'ready', context, cached, notice: 'cancelled' });
        return;
      }
      const request = response.request;
      if (request === null) {
        fail('collect');
        return;
      }
      const reviews = filterByWindow(request.reviews, minDate);
      if (reviews.length === 0) {
        busyRef.current = false;
        setPhase({ kind: 'empty_window', context, scope });
        setBadge(null, 'idle');
        return;
      }
      setPhase({ kind: 'analyzing', context, scope });
      const current = settingsRef.current ?? DEFAULT_SETTINGS;
      try {
        const outcome = await runAnalysis(
          { ...request, reviews },
          // A windowed profile is a personal view: it never goes to the shared server cache.
          { sendToServer: current.sendToServer && scope.window === 'all' },
          { store: (placeId, result) => setCachedResult(placeId, result, scope.window) },
        );
        busyRef.current = false;
        setPhase({
          kind: 'result',
          context,
          result: outcome.result,
          fallbackReason: outcome.fallbackReason ?? null,
          collectStatus: response.status,
          scope,
          sortedByNewest: response.sortedByNewest,
          loaded: request.reviews.length,
        });
        if (scope.window === 'all') {
          setBadge(outcome.result.score, outcome.result.score === null ? 'insufficient' : 'done');
        } else {
          // The badge always shows the all-time profile; "idle" re-syncs it from the cache.
          setBadge(null, 'idle');
        }
      } catch {
        fail('analysis');
      }
    })();
  }, []);

  const cancel = useCallback(() => {
    const tabId = tabIdRef.current;
    if (tabId === null) return;
    sendToTab(tabId, { type: 'CANCEL_COLLECT' }).catch(ignore);
  }, []);

  const showCached = useCallback(() => {
    const current = phaseRef.current;
    if (current.kind !== 'ready' || current.cached === null) return;
    const limit = (settingsRef.current ?? DEFAULT_SETTINGS).sampleLimit;
    setPhase({
      kind: 'result',
      context: current.context,
      result: current.cached.result,
      fallbackReason: null,
      collectStatus: 'cached',
      scope: { limit, window: 'all' },
      sortedByNewest: false,
      loaded: current.cached.result.reviewCount,
    });
  }, []);

  const back = useCallback(() => {
    void refresh(false);
  }, [refresh]);

  return { phase, analyze, cancel, showCached, back };
}
