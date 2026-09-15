/**
 * Typed message protocol between the three extension contexts:
 *
 * - side panel -> content script (`browser.tabs.sendMessage`): TabMessage
 * - content script -> side panel / background (`browser.runtime.sendMessage`): RuntimeMessage
 *
 * Every message carries a `type` discriminator. Responses are typed per
 * request type through the response maps below, so callers never touch `any`.
 */
import type { AnalysisRequestInput } from '@signalyze/shared';
import { browser } from 'wxt/browser';
import type { CollectStatus, LayoutCheck, PlaceContext } from '@/adapters/google-maps';

export const BADGE_STATES = ['idle', 'loading', 'done', 'insufficient', 'unsupported'] as const;
export type BadgeState = (typeof BADGE_STATES)[number];

// ---------------------------------------------------------------------------
// Side panel -> content script
// ---------------------------------------------------------------------------

export interface GetPlaceContextMessage {
  type: 'GET_PLACE_CONTEXT';
}

export interface CollectReviewsMessage {
  type: 'COLLECT_REVIEWS';
  /** Resolved number of reviews to load (the content script bounds it by the ceiling). */
  limit: number;
  /** First day ("YYYY-MM-DD") of the requested period, or null for all time. */
  minDate: string | null;
}

export interface CancelCollectMessage {
  type: 'CANCEL_COLLECT';
}

export interface SetBadgeMessage {
  type: 'SET_BADGE';
  score: number | null;
  state: BadgeState;
}

export type TabMessage =
  GetPlaceContextMessage | CollectReviewsMessage | CancelCollectMessage | SetBadgeMessage;

export interface PlaceContextResponse {
  context: PlaceContext | null;
  layout: LayoutCheck;
  /**
   * False only when a document-level rule (main panel, place name, reviews
   * tab) is missing. Review-level rules may be missing simply because no
   * review has been rendered yet, which is not a layout change.
   */
  layoutSupported: boolean;
}

export type CollectOutcome = CollectStatus | 'no_place' | 'error';

export interface CollectReviewsResponse {
  status: CollectOutcome;
  /** Ready-to-send request with hashed reviewers, or null when nothing usable was read. */
  request: AnalysisRequestInput | null;
  /** Reviews read from the page before validation. */
  collected: number;
  /** Reviews dropped because they did not pass the shared schema. */
  dropped: number;
  /** True when Google's Newest order was active for this collection (see adapters/google-maps/panel.ts). */
  sortedByNewest: boolean;
}

export interface AckResponse {
  ok: boolean;
}

export interface TabResponseMap {
  GET_PLACE_CONTEXT: PlaceContextResponse;
  COLLECT_REVIEWS: CollectReviewsResponse;
  CANCEL_COLLECT: AckResponse;
  SET_BADGE: AckResponse;
}

// ---------------------------------------------------------------------------
// Content script -> extension pages
// ---------------------------------------------------------------------------

export interface CollectProgressMessage {
  type: 'COLLECT_PROGRESS';
  count: number;
  limit: number;
}

export interface OpenSidePanelMessage {
  type: 'OPEN_SIDE_PANEL';
}

export type RuntimeMessage = CollectProgressMessage | OpenSidePanelMessage;

export interface RuntimeResponseMap {
  COLLECT_PROGRESS: undefined;
  OPEN_SIDE_PANEL: AckResponse;
}

// ---------------------------------------------------------------------------
// Type guards (messages arrive as `unknown`)
// ---------------------------------------------------------------------------

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function isBadgeState(value: unknown): value is BadgeState {
  return typeof value === 'string' && (BADGE_STATES as readonly string[]).includes(value);
}

export function isTabMessage(value: unknown): value is TabMessage {
  const record = asRecord(value);
  if (!record) return false;
  switch (record.type) {
    case 'GET_PLACE_CONTEXT':
    case 'CANCEL_COLLECT':
      return true;
    case 'COLLECT_REVIEWS':
      return (
        typeof record.limit === 'number' &&
        Number.isFinite(record.limit) &&
        (record.minDate === null || typeof record.minDate === 'string')
      );
    case 'SET_BADGE':
      return (
        (record.score === null || typeof record.score === 'number') && isBadgeState(record.state)
      );
    default:
      return false;
  }
}

export function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  const record = asRecord(value);
  if (!record) return false;
  switch (record.type) {
    case 'OPEN_SIDE_PANEL':
      return true;
    case 'COLLECT_PROGRESS':
      return typeof record.count === 'number' && typeof record.limit === 'number';
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Senders
// ---------------------------------------------------------------------------

/** Sends a message to the content script in `tabId` and resolves with its typed response. */
export function sendToTab<M extends TabMessage>(
  tabId: number,
  message: M,
): Promise<TabResponseMap[M['type']]> {
  return browser.tabs.sendMessage<M, TabResponseMap[M['type']]>(tabId, message);
}

/** Sends a message to every extension page (side panel, background). */
export function sendToRuntime<M extends RuntimeMessage>(
  message: M,
): Promise<RuntimeResponseMap[M['type']]> {
  return browser.runtime.sendMessage<M, RuntimeResponseMap[M['type']]>(message);
}
