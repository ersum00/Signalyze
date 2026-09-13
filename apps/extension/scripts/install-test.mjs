#!/usr/bin/env node
/* eslint-disable no-restricted-syntax -- Playwright evaluate() is not a DOM query */
/* global chrome -- available inside the extension service worker */
/**
 * Installs the built extension (.output/chrome-mv3) into a real Chromium via
 * Playwright and checks that Chrome accepts the manifest: the service worker
 * must start and the manifest must be reachable from it. This mirrors the
 * Chrome Web Store's automated installation test.
 *
 *   pnpm --filter @signalyze/extension build && node scripts/install-test.mjs
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const extensionDir = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '..',
  '.output',
  'chrome-mv3',
);
if (!existsSync(join(extensionDir, 'manifest.json'))) {
  console.error(`no build at ${extensionDir}; run the build first`);
  process.exit(1);
}

// Static checks Chrome performs at install time for match patterns.
const manifest = JSON.parse(readFileSync(join(extensionDir, 'manifest.json'), 'utf8'));
const patterns = [
  ...(manifest.host_permissions ?? []),
  ...(manifest.content_scripts ?? []).flatMap((cs) => cs.matches ?? []),
];
const VALID = /^(\*|https?|file|ftp|wss?):\/\/(\*|\*\.[^*/]+|[^*/]+)\/.*$/;
const bad = patterns.filter((p) => p !== '<all_urls>' && !VALID.test(p));
if (bad.length > 0) {
  console.error('invalid match patterns:', bad);
  process.exit(1);
}
console.log(`match patterns ok (${patterns.length})`);

const profile = mkdtempSync(join(tmpdir(), 'signalyze-install-'));
const context = await chromium.launchPersistentContext(profile, {
  channel: 'chromium', // full Chromium in new headless mode; the headless shell cannot load extensions
  headless: true,
  args: [`--disable-extensions-except=${extensionDir}`, `--load-extension=${extensionDir}`],
});
try {
  let worker = context.serviceWorkers()[0];
  if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 15000 });
  const info = await worker.evaluate(() => {
    const m = chrome.runtime.getManifest();
    return { id: chrome.runtime.id, name: m.name, version: m.version, permissions: m.permissions };
  });
  console.log('installed:', info);
  const page = await context.newPage();
  await page.goto(`chrome-extension://${info.id}/sidepanel.html`);
  await page.waitForSelector('#root', { timeout: 10000 });
  const text = (await page.textContent('body')) ?? '';
  if (text.trim().length === 0) throw new Error('side panel rendered nothing');
  console.log(`side panel renders (${text.trim().length} chars of text)`);
} finally {
  await context.close();
  rmSync(profile, { recursive: true, force: true });
}
console.log('install test passed');
