import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

/**
 * Dev-server-only Vite config for the Chrome Web Store screenshot harness
 * (store/harness). It is never built: store/capture.mjs starts this server
 * programmatically, renders the real side panel components in a plain tab
 * and screenshots them with Playwright. Rooted at the extension folder so
 * Tailwind scans the same sources as the extension build and `/icon/*.png`
 * is served from the same public directory.
 */
const extensionDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: extensionDir,
  publicDir: 'src/public',
  appType: 'mpa',
  plugins: [tailwindcss()],
  // Vite 8 transforms TSX with oxc (the esbuild option is ignored there);
  // the automatic runtime replaces @vitejs/plugin-react for this harness.
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: '127.0.0.1', open: false },
  logLevel: 'warn',
});
