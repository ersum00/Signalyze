// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://signalyze.veriskor.com',
  output: 'static',
  trailingSlash: 'never',
  // 'preserve' mirrors the source tree: "privacy.astro" → "/privacy.html" and
  // "[lang]/index.astro" → "/tr/index.html" (with 'file' the locale home would
  // be "/tr.html", and nginx would answer "/tr/" with 403). nginx
  // (deploy/nginx/landing.conf, `try_files $uri $uri.html $uri/`) serves
  // "/tr/privacy" from "/tr/privacy.html" and "/tr" from "/tr/index.html".
  build: { format: 'preserve' },
  // English pages live at the root ("/privacy"); the other locales are
  // generated from src/pages/[lang]/* ("/tr/privacy", "/de/privacy", ...).
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'tr', 'de', 'es'],
    routing: { prefixDefaultLocale: false },
  },
  vite: { plugins: [tailwindcss()] },
});
