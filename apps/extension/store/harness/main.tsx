// The chrome stub must load before any extension module (see stubs.ts).
import './stubs';
import '@/assets/tailwind.css';
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from '@/i18n/react';
import { SCENES, type Scene } from './scenes';

function Harness({ scene }: { scene: Scene }) {
  useEffect(() => {
    // Signals store/capture.mjs that the tree has been committed.
    document.documentElement.dataset.ready = '1';
  }, []);
  return <I18nProvider locale="en">{scene.render()}</I18nProvider>;
}

const requested = new URLSearchParams(window.location.search).get('scene') ?? '1';
const scene = SCENES[requested];
if (scene === undefined) {
  throw new Error(`unknown scene "${requested}"; known: ${Object.keys(SCENES).join(', ')}`);
}
const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('harness root element missing');
}
document.title = `Signalyze store harness: ${requested}`;

createRoot(rootElement).render(
  <StrictMode>
    <Harness scene={scene} />
  </StrictMode>,
);
