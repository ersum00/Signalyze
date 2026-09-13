/**
 * Minimal i18n: flat JSON dictionaries per locale, `{name}` placeholders and
 * a `.one` / `.other` plural convention. No ICU, no runtime parsing.
 */
import { SUPPORTED_LOCALES, type Locale } from '@signalyze/shared';
import { browser } from 'wxt/browser';
import { formatNumber } from '@/lib/format';
import type { LocaleSetting } from '@/lib/storage';
import de from './de.json';
import en from './en.json';
import es from './es.json';
import tr from './tr.json';

export type MessageKey = keyof typeof en;
type PluralBase<K> = K extends `${infer Base}.one` ? Base : never;
/** Keys that exist as `<key>.one` / `<key>.other` pairs. */
export type PluralKey = PluralBase<MessageKey>;
export type MessageParams = Record<string, string | number>;

export const MESSAGES: Record<Locale, Record<string, string>> = { en, tr, de, es };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Replaces `{name}` placeholders; numbers are formatted for the locale, unknown names are left as is. */
export function interpolate(
  template: string,
  params: MessageParams | undefined,
  locale: Locale,
): string {
  return template.replace(/\{(\w+)\}/g, (match: string, name: string) => {
    const value = params?.[name];
    if (value === undefined) return match;
    return typeof value === 'number' ? formatNumber(value, locale) : value;
  });
}

export function translate(locale: Locale, key: MessageKey, params?: MessageParams): string {
  const template = MESSAGES[locale][key] ?? MESSAGES.en[key] ?? key;
  return interpolate(template, params, locale);
}

/** Picks `<key>.one` when count is exactly 1, `<key>.other` otherwise, and exposes `{count}`. */
export function translatePlural(
  locale: Locale,
  key: PluralKey,
  count: number,
  params: MessageParams = {},
): string {
  const suffix = count === 1 ? 'one' : 'other';
  return translate(locale, `${key}.${suffix}`, { ...params, count });
}

/** "tr-TR" -> "tr"; unsupported tags give null. */
export function localeFromLanguageTag(tag: string): Locale | null {
  const base = tag.trim().toLowerCase().split(/[-_]/)[0] ?? '';
  return isLocale(base) ? base : null;
}

/** The browser UI language mapped to a supported locale, defaulting to English. */
export function detectUiLocale(): Locale {
  let tag = '';
  try {
    tag = browser.i18n.getUILanguage();
  } catch {
    tag = '';
  }
  if (tag === '') {
    try {
      tag = navigator.language;
    } catch {
      tag = '';
    }
  }
  return localeFromLanguageTag(tag) ?? 'en';
}

export function resolveLocale(settings: { locale: LocaleSetting }): Locale {
  return settings.locale === 'auto' ? detectUiLocale() : settings.locale;
}
