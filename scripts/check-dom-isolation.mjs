#!/usr/bin/env node
/**
 * Belt-and-braces check (in addition to the ESLint rule): no DOM query calls
 * outside apps/extension/src/adapters/google-maps/. Runs on raw source text so
 * it also covers files ESLint might skip.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const ALLOWED_PREFIX = 'apps/extension/src/adapters/google-maps/';
const SCAN_ROOTS = ['apps/extension/src', 'apps/extension/entrypoints', 'packages'];
const DOM_CALL =
  /\.(querySelector|querySelectorAll|getElementsByClassName|getElementsByTagName|getElementsByName|closest|evaluate)\s*\(/g;
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', '.output', '.wxt', 'fixtures']);

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
for (const rootEntry of SCAN_ROOTS) {
  const abs = join(root, rootEntry);
  try {
    statSync(abs);
  } catch {
    continue;
  }
  for (const file of walk(abs)) {
    if (!/\.(ts|tsx)$/.test(file)) continue;
    const rel = relative(root, file).split(sep).join('/');
    if (rel.startsWith(ALLOWED_PREFIX)) continue;
    if (/\.test\.tsx?$/.test(rel)) continue;
    const text = readFileSync(file, 'utf8');
    DOM_CALL.lastIndex = 0;
    let m;
    while ((m = DOM_CALL.exec(text)) !== null) {
      const line = text.slice(0, m.index).split('\n').length;
      console.error(`${rel}:${line}  DOM query "${m[1]}" outside the Google Maps adapter`);
      violations += 1;
    }
  }
}

if (violations > 0) {
  console.error(`\nDOM isolation check failed: ${violations} occurrence(s).`);
  process.exit(1);
}
console.log('DOM isolation check passed.');
