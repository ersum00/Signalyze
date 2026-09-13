import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * The public documents live outside this app so that the extension, the API
 * and the site all read the same file. `base` is resolved from the project
 * root (apps/landing), so `../../docs` is the repository's docs folder.
 */
const docs = defineCollection({
  loader: glob({ pattern: ['PRIVACY.md', 'METHODOLOGY.md'], base: '../../docs' }),
});

const changelog = defineCollection({
  loader: glob({ pattern: 'CHANGELOG.md', base: '../..' }),
});

export const collections = { docs, changelog };
