import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { useTranslations, type Key, type Locale } from '../i18n';

export interface Screenshot {
  /** Public URL, e.g. `/screenshots/01-score.png`. */
  src: string;
  alt: string;
}

/** File-name stems that have a specific localised alt text. */
const KNOWN_STEMS = ['score', 'signals', 'charts', 'reviewers', 'consent', 'settings'] as const;
type KnownStem = (typeof KNOWN_STEMS)[number];

function isKnownStem(value: string): value is KnownStem {
  return (KNOWN_STEMS as readonly string[]).includes(value);
}

/**
 * Lists `public/screenshots/*.png` at build time, sorted by file name. The
 * folder is optional: another engineer produces the images, and when it is
 * absent or empty the home page renders no gallery at all.
 */
export function getScreenshots(locale: Locale): Screenshot[] {
  let files: string[];
  try {
    const dir = fileURLToPath(new URL('../../public/screenshots/', import.meta.url));
    files = readdirSync(dir)
      .filter((name) => name.toLowerCase().endsWith('.png'))
      .sort((a, b) => a.localeCompare(b, 'en'));
  } catch {
    return [];
  }
  const t = useTranslations(locale);
  return files.map((name, index) => {
    // "01-score.png" → "score"; unknown stems get a numbered alt text.
    const stem = name
      .replace(/\.png$/i, '')
      .replace(/^[\d\s_-]+/, '')
      .toLowerCase();
    const key: Key = isKnownStem(stem) ? `shots.alt.${stem}` : 'shots.alt';
    return { src: `/screenshots/${name}`, alt: t(key, { n: index + 1 }) };
  });
}
