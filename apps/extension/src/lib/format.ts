/**
 * Locale-aware number and date formatting used by explanations and the
 * side panel. Everything goes through Intl so Turkish, German and Spanish
 * separators come out right without hand-written rules.
 */
import type { Locale, SignalDefinition } from '@signalyze/shared';

/** A 0..1 share as a whole percentage, rounded half up (0.615 -> 62). */
export function percent(share: number): number {
  return Math.round(share * 100);
}

export interface NumberFormatOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export function formatNumber(
  value: number,
  locale: Locale,
  options: NumberFormatOptions = {},
): string {
  const minimum = options.minimumFractionDigits ?? 0;
  const maximum = Math.max(minimum, options.maximumFractionDigits ?? 2);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: minimum,
    maximumFractionDigits: maximum,
  }).format(value);
}

/** A 0..1 share rendered with the locale's percent style ("62%", "%62", "62 %"). */
export function formatShare(share: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(
    share,
  );
}

/** Overall rating with one decimal ("4.4", "4,4"). */
export function formatRating(rating: number, locale: Locale): string {
  return formatNumber(rating, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-\d{2}$/;

/** "2026-03-12" -> "Mar 12, 2026" / "12 Mar 2026" / "12. März 2026". Invalid input is returned as is. */
export function formatDay(isoDay: string, locale: Locale): string {
  if (!ISO_DAY.test(isoDay)) return isoDay;
  const date = new Date(`${isoDay}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDay;
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** "2026-03" -> "Mar 2026" / "März 2026". Invalid input is returned as is. */
export function formatMonth(yearMonth: string, locale: Locale): string {
  if (!ISO_MONTH.test(yearMonth)) return yearMonth;
  const date = new Date(`${yearMonth}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return yearMonth;
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** Short month label for chart ticks ("Mar", "Mär"). */
export function formatMonthShort(yearMonth: string, locale: Locale): string {
  if (!ISO_MONTH.test(yearMonth)) return yearMonth;
  const date = new Date(`${yearMonth}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return yearMonth;
  return new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(date);
}

/** ISO timestamp -> "Mar 12, 2026, 14:05". Invalid input is returned as is. */
export function formatDateTime(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

/** Renders a signal's raw `value` according to its declared `valueFormat`. */
export function formatSignalValue(
  value: number,
  format: SignalDefinition['valueFormat'],
  locale: Locale,
): string {
  switch (format) {
    case 'ratio':
      return formatShare(value, locale);
    case 'score':
      return formatNumber(value, locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'count':
      return formatNumber(Math.round(value), locale, { maximumFractionDigits: 0 });
  }
}
