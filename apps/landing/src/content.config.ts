import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * The public documents live outside this app so that the extension, the API
 * and the site all read the same file. `base` is resolved from the project
 * root (apps/landing), so `../../docs` is the repository's docs folder.
 *
 * English is the reference version (`PRIVACY.md`); translations sit next to it
 * as `PRIVACY.tr.md`, `PRIVACY.de.md`, `PRIVACY.es.md`. The entry id is the
 * lower-cased file name without extension, so `docs/PRIVACY.tr.md` is
 * `privacy.tr` and the page for a locale asks for `<doc>.<locale>` first and
 * falls back to `<doc>` (see src/components/DocPage.astro).
 */
const docs = defineCollection({
  loader: glob({
    pattern: ['PRIVACY.md', 'PRIVACY.*.md', 'METHODOLOGY.md', 'METHODOLOGY.*.md'],
    base: '../../docs',
    generateId: ({ entry }) => entry.replace(/\.md$/i, '').toLowerCase(),
  }),
});

/** The changelog is kept in English only and rendered as-is in every locale. */
const changelog = defineCollection({
  loader: glob({ pattern: 'CHANGELOG.md', base: '../..' }),
});

export const collections = { docs, changelog };
