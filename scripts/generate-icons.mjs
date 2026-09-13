#!/usr/bin/env node
/**
 * Generates the extension icons (16/32/48/96/128 px) and the landing favicon
 * without any external image tooling: a rounded blue square with three rising
 * "signal" bars. Re-run with `pnpm icons` after changing the palette.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const BG = [37, 99, 235]; // brand-500
const FG = [255, 255, 255];

function render(size) {
  const png = new PNG({ width: size, height: size });
  const radius = size * 0.22;
  const bars = [
    { x0: 0.22, x1: 0.36, y0: 0.62, y1: 0.8 },
    { x0: 0.43, x1: 0.57, y0: 0.44, y1: 0.8 },
    { x0: 0.64, x1: 0.78, y0: 0.24, y1: 0.8 },
  ];
  const ss = 4; // supersampling factor for smooth edges
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
      const total = ss * ss;
      const alpha = bgCover / total;
      const fgRatio = bgCover > 0 ? fgCover / bgCover : 0;
      const idx = (size * y + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        png.data[idx + c] = Math.round(BG[c] * (1 - fgRatio) + FG[c] * fgRatio);
      }
      png.data[idx + 3] = Math.round(alpha * 255);
    }
  }
  return PNG.sync.write(png);
}

function insideRoundedRect(px, py, size, r) {
  const cx = Math.min(Math.max(px, r), size - r);
  const cy = Math.min(Math.max(py, r), size - r);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

const outDirs = [
  join(root, 'apps/extension/src/public/icon'),
  join(root, 'apps/landing/public/icon'),
];
for (const dir of outDirs) mkdirSync(dir, { recursive: true });
for (const size of [16, 32, 48, 96, 128, 180, 512]) {
  const buf = render(size);
  for (const dir of outDirs) writeFileSync(join(dir, `${size}.png`), buf);
}
writeFileSync(join(root, 'apps/landing/public/favicon.png'), render(64));
console.log('icons written');
