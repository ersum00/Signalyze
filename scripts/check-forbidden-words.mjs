#!/usr/bin/env node
/**
 * Scans user-facing text (i18n, docs, landing, README, extension source,
 * signal engine and API source) for words that violate the language policy.
 * Exit code 1 on any match. Source of truth: packages/shared/forbidden-words.json
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const list = JSON.parse(readFileSync(join(root, 'packages/shared/forbidden-words.json'), 'utf8'));

const WORD_CHAR = '[\\p{L}\\p{N}_]';
const patterns = list.entries.map((entry) => ({
  entry,
  regex: new RegExp(
    `(?<!${WORD_CHAR})(?:${entry.pattern})${entry.word ? `(?!${WORD_CHAR})` : ''}`,
    'giu',
  ),
}));

/** Directories / files to scan (relative to repo root). */
const SCAN_ROOTS = [
  'README.md',
  'docs',
  'apps/landing/src',
  'apps/extension/src',
  'apps/extension/entrypoints',
  'apps/extension/wxt.config.ts',
  'apps/api/signalyze_api',
  'packages/signals/src',
  'packages/shared/src',
  'deploy',
];

const SCAN_EXTENSIONS = new Set([
  '.md',
  '.mdx',
  '.json',
  '.ts',
  '.tsx',
  '.astro',
  '.py',
  '.html',
  '.txt',
  '.yml',
  '.yaml',
  '.sh',
  '.caddy',
  '.conf',
  '.service',
  '.sql',
]);

const EXCLUDE_DIRS = new Set([
  'node_modules',
  'dist',
  '.output',
  '.wxt',
  '.astro',
  '.venv',
  '__pycache__',
  'fixtures',
  '__tests__',
  'tests',
]);
const EXCLUDE_FILES = [
  /forbidden-words\.(json|ts)$/,
  /\.test\.tsx?$/,
  /test_.*\.py$/,
  /conftest\.py$/,
];

function* walk(path) {
  const st = statSync(path);
  if (st.isFile()) {
    yield path;
    return;
  }
  for (const name of readdirSync(path)) {
    if (EXCLUDE_DIRS.has(name)) continue;
    yield* walk(join(path, name));
  }
}

let violations = 0;
let filesScanned = 0;
for (const rootEntry of SCAN_ROOTS) {
  const abs = join(root, rootEntry);
  let exists = true;
  try {
    statSync(abs);
  } catch {
    exists = false;
  }
  if (!exists) continue;
  for (const file of walk(abs)) {
    const rel = relative(root, file).split(sep).join('/');
    if (EXCLUDE_FILES.some((re) => re.test(rel))) continue;
    const ext = rel.slice(rel.lastIndexOf('.'));
    if (!SCAN_EXTENSIONS.has(ext)) continue;
    const text = readFileSync(file, 'utf8');
    filesScanned += 1;
    for (const { entry, regex } of patterns) {
      regex.lastIndex = 0;
      let m;
      while ((m = regex.exec(text)) !== null) {
        const before = text.slice(0, m.index);
        const line = before.split('\n').length;
        const col = m.index - before.lastIndexOf('\n');
        console.error(
          `${rel}:${line}:${col}  "${m[0]}"  (policy entry: ${entry.pattern} [${entry.lang}])`,
        );
        violations += 1;
        if (m[0].length === 0) regex.lastIndex += 1;
      }
    }
  }
}

if (violations > 0) {
  console.error(
    `\nForbidden-words check failed: ${violations} occurrence(s) in ${filesScanned} files. See docs/LEGAL_NOTES.md.`,
  );
  process.exit(1);
}
console.log(`Forbidden-words check passed (${filesScanned} files scanned).`);
