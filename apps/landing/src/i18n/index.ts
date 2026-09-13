import { SUPPORTED_LOCALES, type Locale } from '@signalyze/shared';
import { de } from './de';
import { en } from './en';
import { es } from './es';
import { tr } from './tr';
import type { Dictionary, Key } from './types';

export type { Dictionary, Key } from './types';
export type { Locale } from '@signalyze/shared';

/** All site locales, in switcher order. English is the default and has no URL prefix. */
export const LOCALES: readonly Locale[] = SUPPORTED_LOCALES;
export const DEFAULT_LOCALE: Locale = 'en';
/** Locales that live under a URL prefix (`/tr/...`), i.e. the `[lang]` routes. */
export const PREFIXED_LOCALES: readonly Locale[] = LOCALES.filter((l) => l !== DEFAULT_LOCALE);

const DICTIONARIES: Record<Locale, Dictionary> = { en, tr, de, es };

/** Short labels for the language switcher. */
export const LOCALE_LABELS: Record<Locale, string> = { en: 'EN', tr: 'TR', de: 'DE', es: 'ES' };
/** Native language names, used for `title` attributes and the fallback note. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  tr: 'Türkçe',
  de: 'Deutsch',
  es: 'Español',
};
/** Open Graph locale codes. */
export const OG_LOCALES: Record<Locale, string> = {
  en: 'en_US',
  tr: 'tr_TR',
  de: 'de_DE',
  es: 'es_ES',
};

// Build-time guard: a key missing from, or added to, one locale must fail the
// build even if the dictionary type was bypassed (for example via a cast).
{
  const reference = Object.keys(en).sort();
  for (const locale of LOCALES) {
    const keys = Object.keys(DICTIONARIES[locale]).sort();
    const missing = reference.filter((k) => !keys.includes(k));
    const extra = keys.filter((k) => !reference.includes(k));
    if (missing.length > 0 || extra.length > 0) {
      throw new Error(
        `i18n: locale "${locale}" does not match the English key set. Missing: [${missing.join(', ')}]. Extra: [${extra.join(', ')}].`,
      );
    }
  }
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Resolves the `[lang]` route param, throwing on anything that is not a prefixed locale. */
export function localeFromParams(params: Record<string, string | undefined>): Locale {
  const { lang } = params;
  if (!isLocale(lang) || lang === DEFAULT_LOCALE) {
    throw new Error(`Unknown locale route parameter: ${String(lang)}`);
  }
  return lang;
}

/** `getStaticPaths` result for every `[lang]` page. */
export function localePaths(): { params: { lang: Locale } }[] {
  return PREFIXED_LOCALES.map((lang) => ({ params: { lang } }));
}

export type Vars = Record<string, string | number>;

/** Returns a translator for one locale: `t('how.step1.text', { min: 15 })`. */
export function useTranslations(locale: Locale): (key: Key, vars?: Vars) => string {
  const dictionary = DICTIONARIES[locale];
  return (key, vars) => {
    const text = dictionary[key];
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (match, name: string) => {
      const value = vars[name];
      return value === undefined ? match : String(value);
    });
  };
}

/**
 * Site-relative URL of a logical page path in a locale.
 * `localePath('tr', '/privacy')` is `/tr/privacy`; `localePath('tr', '/')` is `/tr`;
 * English paths are unprefixed.
 */
export function localePath(locale: Locale, path: string): string {
  const clean = path === '/' ? '' : path.replace(/\/$/, '');
  if (locale === DEFAULT_LOCALE) return clean || '/';
  return `/${locale}${clean}`;
}

/**
 * The locale-independent page path for a build-time pathname, e.g.
 * `/tr/privacy.html` → `/privacy`, `/tr.html` → `/`, `/index.html` → `/`.
 */
export function logicalPath(pathname: string, locale: Locale): string {
  let path = pathname.replace(/\.html$/, '').replace(/\/index$/, '/');
  if (locale !== DEFAULT_LOCALE) {
    const prefix = `/${locale}`;
    if (path === prefix) path = '/';
    else if (path.startsWith(`${prefix}/`)) path = path.slice(prefix.length);
  }
  return path === '' ? '/' : path;
}
