import type { en } from './en';

/** Every message key, defined by the English dictionary. */
export type Key = keyof typeof en;

/**
 * A complete dictionary. Typing the other locales as `Dictionary` makes a
 * missing or extra key a type error in `astro check`; ./index.ts repeats the
 * check at build time so a plain `astro build` fails too.
 */
export type Dictionary = Record<Key, string>;
