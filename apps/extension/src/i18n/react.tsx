import type { Locale } from '@signalyze/shared';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  translate,
  translatePlural,
  type MessageKey,
  type MessageParams,
  type PluralKey,
} from './index';

export interface I18n {
  locale: Locale;
  t: (key: MessageKey, params?: MessageParams) => string;
  tp: (key: PluralKey, count: number, params?: MessageParams) => string;
}

export function makeI18n(locale: Locale): I18n {
  return {
    locale,
    t: (key, params) => translate(locale, key, params),
    tp: (key, count, params) => translatePlural(locale, key, count, params),
  };
}

const I18nContext = createContext<I18n>(makeI18n('en'));

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => makeI18n(locale), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  return useContext(I18nContext);
}
