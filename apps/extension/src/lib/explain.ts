/**
 * Turns a SignalResult into the localized, factual sentence shown in the
 * side panel. Parameters are taken from the engine's `details` keys; every
 * parameter has a fallback so a result from another engine version still
 * renders without leftover placeholders.
 */
import {
  BURST_WINDOW_DAYS,
  LOCAL_GUIDE_ESTABLISHED_LEVEL,
  SHORT_TEXT_CHARS,
  type Locale,
  type SignalDetailValue,
  type SignalId,
  type SignalResult,
} from '@signalyze/shared';
import { translate, type MessageParams } from '@/i18n';
import { formatDay, formatMonth, formatNumber, percent } from './format';

type Details = Record<string, SignalDetailValue>;

function num(details: Details, key: string, fallback: number): number {
  const value = details[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function str(details: Details, key: string, fallback: string): string {
  const value = details[key];
  return typeof value === 'string' ? value : fallback;
}

/** Parameters for `signal.<id>.explain` and `signal.<id>.unavailable`. */
export function explanationParams(signal: SignalResult, locale: Locale): MessageParams {
  const d = signal.details;
  const valuePercent = percent(signal.value);
  switch (signal.id) {
    case 'burst_ratio':
      return {
        peakPercent: percent(num(d, 'peakShare', signal.value)),
        peakCount: num(d, 'peakCount', 0),
        windowDays: num(d, 'windowDays', BURST_WINDOW_DAYS),
        start: formatDay(str(d, 'peakWindowStart', ''), locale),
        end: formatDay(str(d, 'peakWindowEnd', ''), locale),
      };
    case 'rating_polarity':
      return {
        percent: valuePercent,
        share5: percent(num(d, 'share5', 0)),
        share1: percent(num(d, 'share1', 0)),
      };
    case 'single_review_accounts':
      return {
        percent: valuePercent,
        singles: num(d, 'singles', 0),
        known: num(d, 'known', 0),
        minKnown: num(d, 'minKnown', 15),
      };
    case 'no_photo_short_text':
      return {
        percent: valuePercent,
        count: num(d, 'count', 0),
        chars: num(d, 'shortTextChars', SHORT_TEXT_CHARS),
      };
    case 'text_similarity':
      return {
        mean: formatNumber(num(d, 'meanJaccard', signal.value), locale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        pairPercent: percent(num(d, 'highPairShare', 0)),
        highPairs: num(d, 'highPairs', 0),
        pairs: num(d, 'pairs', 0),
        eligible: num(d, 'eligible', 0),
        minEligible: num(d, 'minEligible', 10),
      };
    case 'template_phrases': {
      const top = str(d, 'topPhrases', '');
      return {
        percent: valuePercent,
        phraseBased: num(d, 'phraseBased', 0),
        withText: num(d, 'withText', 0),
        minWithText: num(d, 'minWithText', 10),
        top: top === '' ? translate(locale, 'signals.none') : top,
      };
    }
    case 'rating_text_mismatch':
      return {
        percent: valuePercent,
        mismatches: num(d, 'mismatches', 0),
        scored: num(d, 'scored', 0),
        minScored: num(d, 'minScored', 10),
      };
    case 'date_entropy':
      return {
        percent: percent(num(d, 'normalizedEntropy', signal.value)),
        months: num(d, 'monthsInSpan', 0),
        busiest: formatMonth(str(d, 'busiestMonth', ''), locale),
        busiestPercent: percent(num(d, 'busiestMonthShare', 0)),
        minMonths: num(d, 'minMonths', 3),
      };
    case 'local_guide_ratio':
      return {
        percent: valuePercent,
        level: num(d, 'establishedLevel', LOCAL_GUIDE_ESTABLISHED_LEVEL),
        established: num(d, 'established', 0),
        exposed: num(d, 'exposed', 0),
      };
    case 'owner_response_pattern':
      return {
        percent: valuePercent,
        responded: num(d, 'responded', 0),
        distinct: num(d, 'distinctResponses', 0),
        minResponded: num(d, 'minResponded', 5),
      };
  }
}

/** The explanation sentence, or the reason the signal could not be computed. */
export function explainSignal(signal: SignalResult, locale: Locale): string {
  const key = signal.available
    ? (`signal.${signal.id}.explain` as const)
    : (`signal.${signal.id}.unavailable` as const);
  return translate(locale, key, explanationParams(signal, locale));
}

export function signalName(id: SignalId, locale: Locale): string {
  return translate(locale, `signal.${id}.name`);
}

export function signalShort(id: SignalId, locale: Locale): string {
  return translate(locale, `signal.${id}.short`);
}

export function signalWhy(id: SignalId, locale: Locale): string {
  return translate(locale, `signal.${id}.why`);
}
