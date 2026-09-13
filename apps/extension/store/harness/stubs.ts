/**
 * Minimal `chrome` stand-in so the side panel components can render in a
 * plain browser tab. `wxt/browser` picks `globalThis.chrome` when the module
 * loads, so this file must be the first import of the harness entry point
 * (ES modules evaluate their imports in order).
 */

function noop(): void {
  // Static composition: no extension events ever fire.
}

const listeners = {
  addListener: noop,
  removeListener: noop,
  hasListener: () => false,
};

/** Three cached profiles so the settings screen shows a realistic cache line. */
const resultCache = Object.fromEntries(
  ['0xfixture:0xtemplate', '0xfixture:0xburst', '0xfixture:0xnormal'].map((placeId, index) => [
    placeId,
    { storedAt: `2026-06-0${index + 1}T09:00:00.000Z`, result: {} },
  ]),
);

const chromeStub = {
  runtime: {
    id: 'signalyze-store-harness',
    getManifest: () => ({ version: '0.1.0' }),
    sendMessage: () => Promise.resolve(undefined),
    onMessage: listeners,
  },
  storage: {
    local: {
      get: (key: string) => Promise.resolve(key === 'resultCache' ? { resultCache } : {}),
      set: () => Promise.resolve(),
      remove: () => Promise.resolve(),
    },
    onChanged: listeners,
  },
  i18n: {
    getUILanguage: () => 'en',
  },
  tabs: {
    query: () => Promise.resolve([]),
    onUpdated: listeners,
    onActivated: listeners,
  },
};

Object.assign(globalThis, { chrome: chromeStub });
