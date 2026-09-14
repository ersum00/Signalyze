import { LANDING_URL } from '@signalyze/shared';
import { en } from '../i18n/en';

export const SITE_NAME = 'Signalyze';

/** Public origin of this site; also configured as `site` in astro.config.mjs. */
export const SITE_URL = LANDING_URL;

/** The only place the Chrome Web Store link is defined. */
export const STORE_URL =
  'https://chromewebstore.google.com/detail/signalyze-review-profile/boalccknclijlfkpeaeohcpahidpchcf';

/** Source repository, linked from the footer. */
export const GITHUB_URL = 'https://github.com/ersum00/Signalyze';

/**
 * Shown under every score and in the footer (docs/LEGAL_NOTES.md, section 1).
 * English reference wording; the localised versions are `legal.summary` in
 * src/i18n and must match the extension's `result.mandatory` strings.
 */
export const SUMMARY_SENTENCE = en['legal.summary'];
