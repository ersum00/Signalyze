# Chrome Web Store kit

Everything needed to fill in the Developer Dashboard for Signalyze.

| Path                                | What it is                                                                                                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listing.md`                        | Paste-ready text for every dashboard field (store listing in four languages, privacy practices, distribution) with character limits and counts, plus the upload checklist. |
| `assets/icon-128.png`               | Store icon: 128×128, transparent, brand mark in the central 96×96.                                                                                                         |
| `assets/screenshot-1..5.png`        | 1280×800 screenshots: the real side panel components rendered with real engine results next to a simplified mock of a Maps place page.                                     |
| `assets/promo-small-440x280.png`    | Small promo tile.                                                                                                                                                          |
| `assets/promo-marquee-1400x560.png` | Marquee promo tile.                                                                                                                                                        |
| `harness/`                          | Vite harness (`index.html`, `main.tsx`, `scenes.tsx`, `data.ts`, `stubs.ts`) that composes the scenes from `src/entrypoints/sidepanel` components.                         |
| `capture.mjs`                       | Generates the icon, starts the Vite dev server (`../vite.store.config.ts`), screenshots every scene with Playwright and verifies sizes, opacity and file size.             |

## Regenerate the assets

```sh
pnpm exec playwright install chromium        # once, if the browser is missing
pnpm --filter @signalyze/extension store:assets
```

The script prints every image with its verified pixel size. Screenshots are always 1280×800, opaque and under 2 MB; the score shown is the engine's computed value for the fixture (`packages/signals/fixtures`: template 43, burst 24, normal 1), never an edited one.

To look at a scene in a browser while adjusting the composition:

```sh
pnpm --filter @signalyze/extension exec vite --config vite.store.config.ts
# then open http://127.0.0.1:5173/store/harness/index.html?scene=2
```

Scenes: `1` score card, `2` signal list (the capture script expands "Burst ratio"), `3` charts, `4` offline result with reviewer tiles, `5` consent and settings, `promo-small`, `promo-marquee`.

## Notes

- Nothing here is part of the extension build: WXT only bundles `src/entrypoints`, and the harness runs from the dev server, so there is no build output to ignore.
- `store/` is not scanned by `scripts/check-forbidden-words.mjs`; run the language-policy check on `listing.md` by hand after editing it (see the checklist at the end of that file).
