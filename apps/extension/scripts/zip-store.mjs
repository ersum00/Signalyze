#!/usr/bin/env node
/**
 * Builds the Chrome Web Store zip WITHOUT the pinned dev `key` in manifest.json
 * (the store assigns its own key and id). Usage: pnpm --filter @signalyze/extension zip:store
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const extensionDir = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const result = spawnSync('pnpm', ['exec', 'wxt', 'zip'], {
  cwd: extensionDir,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, SIGNALYZE_STORE_ZIP: '1' },
});
if (result.status !== 0) process.exit(result.status ?? 1);

const manifest = JSON.parse(
  readFileSync(join(extensionDir, '.output', 'chrome-mv3', 'manifest.json'), 'utf8'),
);
if ('key' in manifest) {
  console.error('store zip must not contain manifest.key');
  process.exit(1);
}
console.log('store zip built without manifest.key');
