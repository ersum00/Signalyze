import { SUPPORTED_LOCALES, containsForbiddenWords, type Locale } from '@signalyze/shared';
import { describe, expect, it } from 'vitest';
import {
  MESSAGES,
  detectUiLocale,
  interpolate,
  localeFromLanguageTag,
  resolveLocale,
  translate,
  translatePlural,
} from './index';

const PLACEHOLDER = /\{(\w+)\}/g;

function placeholders(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER)].map((m) => m[1] ?? '').sort();
}

describe('dictionaries', () => {
  const enKeys = Object.keys(MESSAGES.en).sort();

  it('have identical key sets in all four locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(Object.keys(MESSAGES[locale]).sort(), locale).toEqual(enKeys);
    }
  });

  it('keep every English placeholder in the other locales', () => {
    for (const key of enKeys) {
      const expected = placeholders(MESSAGES.en[key] ?? '');
      for (const locale of SUPPORTED_LOCALES) {
        expect(placeholders(MESSAGES[locale][key] ?? ''), `${locale}:${key}`).toEqual(expected);
      }
    }
  });

  it('have no empty values', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const [key, value] of Object.entries(MESSAGES[locale])) {
        expect(value.trim().length, `${locale}:${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('contain no forbidden words in any locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const [key, value] of Object.entries(MESSAGES[locale])) {
        expect(containsForbiddenWords(value), `${locale}:${key}: ${value}`).toBe(false);
      }
    }
  });

  it('carry the mandatory summary sentence in every locale', () => {
    const expected: Record<Locale, string> = {
      en: 'This score is a statistical summary of public review data; it is not a claim about the business or any reviewer.',
      tr: 'Bu skor kamuya açık yorum verisinin istatistiksel özetidir; işletme veya yorumcu hakkında bir iddia değildir.',
      de: 'Dieser Wert ist eine statistische Zusammenfassung öffentlicher Bewertungsdaten; er ist keine Aussage über das Unternehmen oder einzelne Rezensenten.',
      es: 'Esta puntuación es un resumen estadístico de datos públicos de reseñas; no es una afirmación sobre el negocio ni sobre ningún reseñador.',
    };
    for (const locale of SUPPORTED_LOCALES) {
      expect(translate(locale, 'result.mandatory')).toBe(expected[locale]);
    }
  });
});

describe('translate', () => {
  it('interpolates parameters with locale number formatting', () => {
    expect(translate('en', 'result.analysed', { analysed: 200, total: 1240 })).toBe(
      '200 of 1,240 reviews analysed',
    );
    expect(translate('de', 'result.analysed', { analysed: 200, total: 1240 })).toBe(
      '200 von 1.240 Rezensionen analysiert',
    );
  });

  it('leaves unknown placeholders visible so tests can catch them', () => {
    expect(interpolate('{a} and {b}', { a: 'x' }, 'en')).toBe('x and {b}');
  });

  it('picks singular and plural forms', () => {
    expect(translatePlural('en', 'home.place.reviews', 1)).toBe('1 review');
    expect(translatePlural('en', 'home.place.reviews', 2)).toBe('2 reviews');
    expect(translatePlural('de', 'settings.cacheCount', 1)).toBe('1 gespeichertes Profil');
  });
});

describe('locale resolution', () => {
  it('maps language tags to supported locales', () => {
    expect(localeFromLanguageTag('tr-TR')).toBe('tr');
    expect(localeFromLanguageTag('de')).toBe('de');
    expect(localeFromLanguageTag('es_MX')).toBe('es');
    expect(localeFromLanguageTag('fr-FR')).toBeNull();
  });

  it('honours an explicit setting and falls back to English safely', () => {
    expect(resolveLocale({ locale: 'tr' })).toBe('tr');
    expect(SUPPORTED_LOCALES).toContain(detectUiLocale());
    expect(SUPPORTED_LOCALES).toContain(resolveLocale({ locale: 'auto' }));
  });
});
