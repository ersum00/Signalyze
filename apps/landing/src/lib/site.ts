import { LANDING_URL } from '@signalyze/shared';

export const SITE_NAME = 'Signalyze';

/** Public origin of this site; also configured as `site` in astro.config.mjs. */
export const SITE_URL = LANDING_URL;

/**
 * The only place the Chrome Web Store link is defined. The id is a placeholder
 * until the first Store upload assigns the real one.
 */
export const STORE_URL = 'https://chromewebstore.google.com/detail/signalyze/PLACEHOLDER_STORE_ID';

/** Shown under every score and in the footer (docs/LEGAL_NOTES.md, section 1). */
export const SUMMARY_SENTENCE =
  'This score is a statistical summary of public review data; it is not a claim about the business or any reviewer.';
