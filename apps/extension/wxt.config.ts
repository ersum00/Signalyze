import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import extensionKey from './extension-key.json';

/**
 * Manifest V3, single purpose: show a statistical Review Profile for the
 * Google Maps business page the user is viewing. Permissions are the minimum
 * needed (see docs/STORE_LISTING.md for the per-permission justification).
 *
 * The public `key` pins the extension id for unpacked/dev builds so the API's
 * CORS list can stay fixed. The Chrome Web Store assigns its own key, so the
 * store zip (scripts/zip-store.mjs, SIGNALYZE_STORE_ZIP=1) omits it.
 */
const includeKey = process.env.SIGNALYZE_STORE_ZIP !== '1';

export default defineConfig({
  srcDir: 'src',
  // WXT resolves publicDir against the project root, not srcDir; _locales and
  // icons live under src/public and must ship for the localized manifest.
  publicDir: 'src/public',
  modules: ['@wxt-dev/module-react'],
  manifestVersion: 3,
  manifest: {
    name: '__MSG_extName__',
    short_name: 'Signalyze',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    ...(includeKey ? { key: extensionKey.publicKey } : {}),
    permissions: ['storage', 'activeTab', 'sidePanel'],
    host_permissions: [
      'https://www.google.com/maps/*',
      'https://www.google.*/maps/*',
      'https://maps.google.com/*',
      'https://maps.google.*/*',
      'https://api.signalyze.veriskor.com/*',
    ],
    action: {
      default_title: '__MSG_extName__',
    },
    minimum_chrome_version: '116',
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  zip: {
    artifactTemplate: 'signalyze-{{version}}-{{browser}}.zip',
    excludeSources: ['keys/**', '**/*.pem', 'src/adapters/google-maps/fixtures/**'],
  },
});
