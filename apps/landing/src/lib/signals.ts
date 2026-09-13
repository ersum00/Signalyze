import {
  BURST_WINDOW_DAYS,
  LOCAL_GUIDE_ESTABLISHED_LEVEL,
  NGRAM_SIZE,
  SHORT_TEXT_CHARS,
  SIGNAL_IDS,
  type SignalId,
} from '@signalyze/shared';
import { useTranslations, type Locale } from '../i18n';

export interface SignalCard {
  id: SignalId;
  title: string;
  /** One factual sentence: what is measured, never what it implies. */
  description: string;
}

/**
 * The placeholders each description may use. The texts themselves live in
 * src/i18n as `signal.<id>.title` and `signal.<id>.description`.
 */
const VARS = {
  days: BURST_WINDOW_DAYS,
  chars: SHORT_TEXT_CHARS,
  n: NGRAM_SIZE,
  level: LOCAL_GUIDE_ESTABLISHED_LEVEL,
};

/** All ten signals in canonical order, with landing-page copy in one locale. */
export function getSignals(locale: Locale): readonly SignalCard[] {
  const t = useTranslations(locale);
  return SIGNAL_IDS.map((id) => ({
    id,
    title: t(`signal.${id}.title`),
    description: t(`signal.${id}.description`, VARS),
  }));
}
