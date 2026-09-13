#!/usr/bin/env node
/**
 * Renders the Chrome Web Store assets into store/assets:
 *
 * - icon-128.png: the brand mark on a transparent 128 px canvas (96 px mark,
 *   16 px padding), same drawing as scripts/generate-icons.mjs.
 * - screenshot-1..5.png (1280x800), promo-small-440x280.png and
 *   promo-marquee-1400x560.png: the real side panel components rendered by
 *   the Vite harness in store/harness and screenshotted with Playwright.
 *
 * Usage: pnpm --filter @signalyze/extension store:assets
 * Needs Playwright's Chromium: pnpm exec playwright install chromium
 */
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { createServer } from 'vite';

const storeDir = fileURLToPath(new URL('.', import.meta.url));
const extensionDir = join(storeDir, '..');
const assetsDir = join(storeDir, 'assets');
const MAX_BYTES = 2 * 1024 * 1024;

/** One entry per captured image. `expand` names a signal row to open before the shot. */
const SHOTS = [
  { file: 'screenshot-1.png', scene: '1', width: 1280, height: 800 },
  { file: 'screenshot-2.png', scene: '2', width: 1280, height: 800, expand: 'Burst ratio' },
  { file: 'screenshot-3.png', scene: '3', width: 1280, height: 800, charts: true },
  { file: 'screenshot-4.png', scene: '4', width: 1280, height: 800 },
  { file: 'screenshot-5.png', scene: '5', width: 1280, height: 800 },
  { file: 'promo-small-440x280.png', scene: 'promo-small', width: 440, height: 280 },
  {
    file: 'promo-marquee-1400x560.png',
    scene: 'promo-marquee',
    width: 1400,
    height: 560,
    charts: true,
  },
];

// ---------------------------------------------------------------------------
// Icon
// ---------------------------------------------------------------------------

const BG = [37, 99, 235]; // brand-500
const FG = [255, 255, 255];

function insideRoundedRect(px, py, size, r) {
  const cx = Math.min(Math.max(px, r), size - r);
  const cy = Math.min(Math.max(py, r), size - r);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

/** The rounded blue square with three rising bars, supersampled for smooth edges. */
function renderMark(size) {
  const png = new PNG({ width: size, height: size });
  const radius = size * 0.22;
  const bars = [
    { x0: 0.22, x1: 0.36, y0: 0.62, y1: 0.8 },
    { x0: 0.43, x1: 0.57, y0: 0.44, y1: 0.8 },
    { x0: 0.64, x1: 0.78, y0: 0.24, y1: 0.8 },
  ];
  const ss = 4;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let bgCover = 0;
      let fgCover = 0;
      for (let sy = 0; sy < ss; sy += 1) {
        for (let sx = 0; sx < ss; sx += 1) {
          const px = x + (sx + 0.5) / ss;
          const py = y + (sy + 0.5) / ss;
          if (insideRoundedRect(px, py, size, radius)) {
            bgCover += 1;
            const u = px / size;
            const v = py / size;
            if (bars.some((b) => u >= b.x0 && u <= b.x1 && v >= b.y0 && v <= b.y1)) fgCover += 1;
          }
        }
      }
      const alpha = bgCover / (ss * ss);
      const fgRatio = bgCover > 0 ? fgCover / bgCover : 0;
      const idx = (size * y + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        png.data[idx + c] = Math.round(BG[c] * (1 - fgRatio) + FG[c] * fgRatio);
      }
      png.data[idx + 3] = Math.round(alpha * 255);
    }
  }
  return png;
}

function writeIcon() {
  const mark = renderMark(96);
  const icon = new PNG({ width: 128, height: 128 }); // zero-filled: fully transparent
  PNG.bitblt(mark, icon, 0, 0, 96, 96, 16, 16);
  writeFileSync(join(assetsDir, 'icon-128.png'), PNG.sync.write(icon));
}

// ---------------------------------------------------------------------------
// Screenshots
// ---------------------------------------------------------------------------

/** Re-encodes a Playwright capture as RGB (no alpha channel); fails on any transparency. */
function toOpaquePng(buffer, file) {
  const png = PNG.sync.read(buffer);
  for (let i = 3; i < png.data.length; i += 4) {
    if (png.data[i] !== 255)
      throw new Error(`${file}: transparent pixel found; the scene must be opaque`);
  }
  return PNG.sync.write(png, { colorType: 2 });
}

async function capture(browser, base, shot) {
  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: 1,
    locale: 'en-US',
    timezoneId: 'UTC',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  try {
    await page.goto(`${base}store/harness/index.html?scene=${shot.scene}`, {
      waitUntil: 'networkidle',
    });
    await page.waitForSelector('html[data-ready="1"]');
    await page.waitForFunction('document.fonts.status === "loaded"');
    if (shot.charts) await page.waitForSelector('.recharts-bar-rectangle path');
    if (shot.expand !== undefined) {
      await page.getByRole('button', { name: new RegExp(`^${shot.expand}`) }).click();
      await page.getByText('Why it matters').waitFor();
    }
    await page.waitForTimeout(400);
    if (errors.length > 0) throw new Error(`${shot.scene}: page errors\n${errors.join('\n')}`);
    const buffer = await page.screenshot({ type: 'png' });
    writeFileSync(join(assetsDir, shot.file), toOpaquePng(buffer, shot.file));
  } finally {
    await context.close();
  }
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

function verify(file, expected) {
  const path = join(assetsDir, file);
  const png = PNG.sync.read(readFileSync(path));
  const bytes = statSync(path).size;
  let opaque = true;
  for (let i = 3; i < png.data.length; i += 4) {
    if (png.data[i] !== 255) {
      opaque = false;
      break;
    }
  }
  const problems = [];
  if (png.width !== expected.width || png.height !== expected.height) {
    problems.push(`expected ${expected.width}x${expected.height}`);
  }
  if (expected.opaque && !opaque) problems.push('expected an opaque image');
  if (expected.transparent && opaque) problems.push('expected a transparent background');
  if (bytes > MAX_BYTES) problems.push('larger than 2 MB');
  console.log(
    `${file.padEnd(28)} ${png.width}x${png.height}  ${opaque ? 'opaque' : 'alpha'}  ${(bytes / 1024).toFixed(0).padStart(4)} KB${problems.length > 0 ? `  FAILED: ${problems.join('; ')}` : ''}`,
  );
  return problems.length === 0;
}

function verifyIcon() {
  const png = PNG.sync.read(readFileSync(join(assetsDir, 'icon-128.png')));
  const alphaAt = (x, y) => png.data[(y * png.width + x) * 4 + 3];
  const ok =
    png.width === 128 &&
    png.height === 128 &&
    alphaAt(0, 0) === 0 &&
    alphaAt(15, 64) === 0 &&
    alphaAt(64, 64) === 255;
  console.log(
    `${'icon-128.png'.padEnd(28)} ${png.width}x${png.height}  transparent outside the central 96x96${ok ? '' : '  FAILED'}`,
  );
  return ok;
}

// ---------------------------------------------------------------------------

async function main() {
  mkdirSync(assetsDir, { recursive: true });
  writeIcon();

  const server = await createServer({
    configFile: join(extensionDir, 'vite.store.config.ts'),
    root: extensionDir,
    server: { host: '127.0.0.1', port: 5199, strictPort: false },
  });
  await server.listen();
  const base = server.resolvedUrls?.local[0] ?? 'http://127.0.0.1:5199/';

  let browser;
  try {
    browser = await chromium.launch();
  } catch (error) {
    await server.close();
    console.error(String(error));
    console.error('\nChromium is missing. Run: pnpm exec playwright install chromium');
    process.exit(1);
  }

  try {
    for (const shot of SHOTS) {
      await capture(browser, base, shot);
    }
  } finally {
    await browser.close();
    await server.close();
  }

  let ok = verifyIcon();
  for (const shot of SHOTS) {
    ok = verify(shot.file, { width: shot.width, height: shot.height, opaque: true }) && ok;
  }
  if (!ok) {
    console.error('\nAsset verification failed.');
    process.exit(1);
  }
  console.log(`\nStore assets written to ${assetsDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
