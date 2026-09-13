/**
 * Scene compositions for the Chrome Web Store screenshots and promo tiles.
 *
 * The side panel is the extension's real UI (the sidepanel Header and
 * components) fed with the engine's fixture results. Only the Google Maps
 * page around it is a deliberately simplified stand-in drawn with plain
 * HTML and CSS: no Google artwork, no trademarks beyond the product name.
 */
import type { AnalysisResult } from '@signalyze/shared';
import type { CSSProperties, ReactNode } from 'react';
import type { PlaceContext } from '@/adapters/google-maps';
import { MonthlyChart, RatingChart } from '@/entrypoints/sidepanel/components/Charts';
import { Header } from '@/entrypoints/sidepanel/components/Header';
import { Onboarding } from '@/entrypoints/sidepanel/components/Onboarding';
import { ResultView } from '@/entrypoints/sidepanel/components/ResultView';
import { ReviewerTiles } from '@/entrypoints/sidepanel/components/ReviewerTiles';
import { SettingsView } from '@/entrypoints/sidepanel/components/SettingsView';
import { SignalList } from '@/entrypoints/sidepanel/components/SignalList';
import type { Settings } from '@/lib/storage';
import { fixtureResult, placeFor } from './data';

export interface Scene {
  /** Pixel size of the composition; the screenshot viewport uses the same values. */
  width: number;
  height: number;
  render: () => ReactNode;
}

const SHOT_WIDTH = 1280;
const SHOT_HEIGHT = 800;
const CAPTION_HEIGHT = 56;
const STAGE_HEIGHT = SHOT_HEIGHT - CAPTION_HEIGHT;
const PANEL_WIDTH = 380;
const PAGE_WIDTH = SHOT_WIDTH - PANEL_WIDTH;
const PLACE_PANEL_WIDTH = 408;

const BRAND = '#2563eb';
const BRAND_DARK = '#1e40af';
const INK = '#1f2937';
const MUTED = '#5f6b7a';
const STAR = '#f2a93b';
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/** Captions from docs/STORE_LISTING.md, one per screenshot. */
const CAPTIONS = {
  1: 'One click, one statistical summary.',
  2: 'Every signal explained, with its number.',
  3: 'See the timing and the shape of the ratings.',
  4: 'Works without the server, too.',
  5: 'Nothing leaves your browser until you say so.',
} as const;

const TEMPLATE = fixtureResult('template');
const BURST = fixtureResult('burst');
const NORMAL_OFFLINE = fixtureResult('normal', { source: 'offline' });

const SETTINGS: Settings = {
  locale: 'en',
  badgeEnabled: true,
  sendToServer: true,
  consentGivenAt: '2026-06-01T09:30:00.000Z',
  onboardingDone: true,
};

function noop(): void {
  // Static composition: buttons are rendered but never used.
}

function saveNoop(): Promise<void> {
  return Promise.resolve();
}

// ---------------------------------------------------------------------------
// Side panel: the real Header plus whatever the scene puts in <main>.
// ---------------------------------------------------------------------------

function SidePanel({
  view = 'main',
  height,
  frame = false,
  docked = false,
  children,
}: {
  view?: 'main' | 'settings';
  height: number;
  /** Rounded, shadowed card (promo tiles and the settings scene). */
  frame?: boolean;
  /** Docked to the right edge of the browser window (screenshots 1-4). */
  docked?: boolean;
  children: ReactNode;
}) {
  const style: CSSProperties = {
    width: PANEL_WIDTH,
    height,
    overflow: 'hidden',
    flex: 'none',
    ...(frame
      ? {
          borderRadius: 12,
          border: '1px solid #e3e8ef',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.16)',
        }
      : {}),
    ...(docked ? { borderLeft: '1px solid #d5d9e0' } : {}),
  };
  // The inner column grows with its content, like the App root in the
  // extension; the outer box only clips it, so the Header keeps its height.
  return (
    <div className="bg-paper" style={style}>
      <div className="flex min-h-full flex-col bg-paper">
        <Header view={view} onToggle={noop} />
        <main className="flex-1 px-3 pt-3 pb-4">{children}</main>
      </div>
    </div>
  );
}

function Result({
  result,
  fallbackReason = null,
}: {
  result: AnalysisResult;
  fallbackReason?: string | null;
}) {
  return (
    <ResultView
      context={placeFor(result)}
      result={result}
      fallbackReason={fallbackReason}
      collectStatus="complete"
      limit={200}
      onAnalyze={noop}
    />
  );
}

// ---------------------------------------------------------------------------
// Mock of a Google Maps place page (HTML/CSS only).
// ---------------------------------------------------------------------------

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  const filled = Math.round(rating);
  return (
    <span aria-hidden="true" style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={i <= filled ? STAR : '#d7dbe0'}
        >
          <path d="M12 2.5l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.6 5.9 21l1.5-6.8L2.2 9.5l6.9-.7z" />
        </svg>
      ))}
    </span>
  );
}

/** Looks like the real on-page pill (adapters/google-maps/badge.ts, state "done"). */
function PageBadge({ score }: { score: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 22,
        padding: '0 10px 0 8px',
        borderRadius: 999,
        border: `1px solid ${BRAND}`,
        background: '#eef6ff',
        color: BRAND_DARK,
        font: `600 12px/1 ${FONT}`,
        letterSpacing: '0.01em',
        marginTop: 6,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: BRAND }} />
      <span>Signalyze</span>
      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{score}</span>
    </span>
  );
}

function Bar({
  width,
  height = 9,
  tone = '#e6e9ee',
}: {
  width: number | string;
  height?: number;
  tone?: string;
}) {
  return <span style={{ display: 'block', width, height, borderRadius: 5, background: tone }} />;
}

function ReviewPlaceholder({
  lines,
  rating,
}: {
  lines: readonly (number | string)[];
  rating: number;
}) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '14px 0', borderTop: '1px solid #eceff3' }}>
      <span
        style={{ width: 40, height: 40, borderRadius: '50%', background: '#d9dee5', flex: 'none' }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Bar width={116} height={11} tone="#d9dee5" />
        <div style={{ marginTop: 6 }}>
          <Bar width={152} height={8} />
        </div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Stars rating={rating} size={12} />
          <Bar width={58} height={8} />
        </div>
        <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
          {lines.map((width, i) => (
            <Bar key={i} width={width} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionButton({ label, path }: { label: string; path: string }) {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 72 }}
    >
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '1px solid #d5d9e0',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: BRAND,
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={path} />
        </svg>
      </span>
      <span style={{ fontSize: 12, color: BRAND }}>{label}</span>
    </div>
  );
}

function MapCanvas() {
  const road: CSSProperties = { fill: 'none', strokeLinecap: 'round' };
  return (
    <svg
      width={PAGE_WIDTH}
      height={STAGE_HEIGHT}
      viewBox={`0 0 ${PAGE_WIDTH} ${STAGE_HEIGHT}`}
      style={{ position: 'absolute', inset: 0 }}
      aria-hidden="true"
    >
      <rect width={PAGE_WIDTH} height={STAGE_HEIGHT} fill="#e9e7e2" />
      <ellipse cx="700" cy="150" rx="96" ry="64" fill="#cfe6c4" />
      <rect x="470" y="560" width="170" height="130" rx="22" fill="#cfe6c4" />
      <path d="M760 520 Q 830 470 900 510 L 900 744 L 690 744 Q 715 610 760 520 Z" fill="#b9d9e6" />
      {[
        [430, 60, 70, 46],
        [512, 60, 52, 46],
        [430, 236, 96, 60],
        [612, 236, 70, 60],
        [612, 380, 54, 70],
        [738, 380, 68, 52],
        [430, 380, 80, 56],
        [846, 250, 44, 90],
      ].map(([x, y, w, h]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx="4" fill="#dcd9d2" />
      ))}
      <g style={road} stroke="#d5d1c8" strokeWidth="12">
        <path d="M408 200 H 900" />
        <path d="M408 330 H 900" />
        <path d="M408 470 H 900" />
        <path d="M408 610 H 900" />
        <path d="M580 0 V 744" />
        <path d="M700 0 V 744" />
        <path d="M820 0 V 744" />
        <path d="M408 690 Q 520 640 560 520 T 720 300 T 900 120" />
      </g>
      <g style={road} stroke="#ffffff" strokeWidth="8">
        <path d="M408 200 H 900" />
        <path d="M408 330 H 900" />
        <path d="M408 470 H 900" />
        <path d="M408 610 H 900" />
        <path d="M580 0 V 744" />
        <path d="M700 0 V 744" />
        <path d="M820 0 V 744" />
      </g>
      <path
        d="M408 690 Q 520 640 560 520 T 720 300 T 900 120"
        style={road}
        stroke="#f6e7a8"
        strokeWidth="9"
      />
      <g transform="translate(600 318)">
        <path
          d="M0 0 C -12 -12 -12 -30 0 -30 C 12 -30 12 -12 0 0 Z"
          fill="#e0413a"
          transform="translate(0 4) scale(1.3)"
        />
        <circle cx="0" cy="-30" r="5" fill="#ffffff" transform="translate(0 4) scale(1.3)" />
        <text
          x="16"
          y="-4"
          fontFamily={FONT}
          fontSize="13"
          fontWeight="600"
          fill={INK}
          stroke="#ffffff"
          strokeWidth="3"
          paintOrder="stroke"
        >
          Example Café
        </text>
      </g>
    </svg>
  );
}

function PlacePanel({ place, result }: { place: PlaceContext; result: AnalysisResult }) {
  const d = result.ratingDistribution;
  const total = d[1] + d[2] + d[3] + d[4] + d[5];
  const rating = place.overallRating ?? 0;
  const count = place.totalReviewCount ?? 0;
  const badge = result.score === null ? null : Math.round(result.score);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: PLACE_PANEL_WIDTH,
        height: STAGE_HEIGHT,
        background: '#ffffff',
        boxShadow: '0 0 20px rgba(0, 0, 0, 0.18)',
        overflow: 'hidden',
        fontFamily: FONT,
        color: INK,
      }}
    >
      <div
        style={{
          height: 212,
          background: 'linear-gradient(135deg, #e6c9a8 0%, #b98a62 48%, #7a5238 100%)',
          position: 'relative',
        }}
      >
        <span
          style={{
            position: 'absolute',
            right: 60,
            bottom: 30,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.14)',
          }}
        />
        <span
          style={{
            position: 'absolute',
            left: 40,
            bottom: -40,
            width: 220,
            height: 120,
            borderRadius: 60,
            background: 'rgba(0,0,0,0.12)',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 8,
          right: 8,
          top: 8,
          height: 46,
          background: '#ffffff',
          borderRadius: 8,
          boxShadow: '0 1px 5px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          fontSize: 15,
        }}
      >
        <span style={{ flex: 1 }}>Example Café</span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={BRAND}
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <span style={{ width: 1, height: 24, background: '#e3e8ef', margin: '0 12px' }} />
        <span style={{ color: MUTED, fontSize: 20, lineHeight: 1 }}>×</span>
      </div>

      <div style={{ padding: '18px 20px 0' }}>
        <h1 style={{ margin: 0, font: `500 22px/28px ${FONT}` }}>{place.name}</h1>
        {badge !== null && <PageBadge score={badge} />}
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
          <span>{rating.toFixed(1)}</span>
          <Stars rating={rating} />
          <span style={{ color: MUTED }}>({count.toLocaleString('en-US')})</span>
        </div>
        <div style={{ marginTop: 4, fontSize: 14, color: MUTED }}>
          Café · $$ · Open · Closes 22:00
        </div>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
          <ActionButton label="Directions" path="M12 3l9 9-9 9-9-9z" />
          <ActionButton label="Save" path="M6 4h12v17l-6-4-6 4z" />
          <ActionButton
            label="Nearby"
            path="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
          />
          <ActionButton label="Share" path="M4 12v8h16v-8M12 3v13M8 7l4-4 4 4" />
        </div>

        <div
          style={{
            marginTop: 18,
            display: 'flex',
            borderBottom: '1px solid #e3e8ef',
            fontSize: 14,
          }}
        >
          {['Overview', 'Reviews', 'About'].map((tab) => (
            <span
              key={tab}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '10px 0',
                color: tab === 'Reviews' ? BRAND : MUTED,
                fontWeight: tab === 'Reviews' ? 600 : 400,
                borderBottom: tab === 'Reviews' ? `3px solid ${BRAND}` : '3px solid transparent',
              }}
            >
              {tab}
            </span>
          ))}
        </div>

        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ flex: 1, display: 'grid', gap: 5 }}>
            {([5, 4, 3, 2, 1] as const).map((stars) => (
              <div
                key={stars}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  color: MUTED,
                }}
              >
                <span style={{ width: 8, textAlign: 'right' }}>{stars}</span>
                <span
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 4,
                    background: '#eceff3',
                    overflow: 'hidden',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      height: '100%',
                      width: `${total > 0 ? (d[stars] / total) * 100 : 0}%`,
                      background: STAR,
                    }}
                  />
                </span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', width: 110 }}>
            <div style={{ fontSize: 34, lineHeight: 1 }}>{rating.toFixed(1)}</div>
            <div style={{ marginTop: 6 }}>
              <Stars rating={rating} size={13} />
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: MUTED }}>
              {count.toLocaleString('en-US')} reviews
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 8, fontSize: 13 }}>
          {['Most relevant', 'Newest', 'Highest', 'Lowest'].map((chip, i) => (
            <span
              key={chip}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                border: `1px solid ${i === 0 ? BRAND : '#d5d9e0'}`,
                background: i === 0 ? '#eef6ff' : '#ffffff',
                color: i === 0 ? BRAND_DARK : INK,
              }}
            >
              {chip}
            </span>
          ))}
        </div>

        <div style={{ marginTop: 14 }}>
          <ReviewPlaceholder rating={5} lines={['100%', '94%', '58%']} />
          <ReviewPlaceholder rating={4} lines={['100%', '72%']} />
          <ReviewPlaceholder rating={5} lines={['100%', '97%', '83%', '40%']} />
          <ReviewPlaceholder rating={3} lines={['96%', '61%']} />
        </div>
      </div>
    </div>
  );
}

function MapsPage({ result }: { result: AnalysisResult }) {
  return (
    <div
      style={{
        position: 'relative',
        width: PAGE_WIDTH,
        height: STAGE_HEIGHT,
        overflow: 'hidden',
        flex: 'none',
      }}
    >
      <MapCanvas />
      <PlacePanel place={placeFor(result)} result={result} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screenshot frame: stage + caption strip.
// ---------------------------------------------------------------------------

function Shot({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div
      style={{
        width: SHOT_WIDTH,
        height: SHOT_HEIGHT,
        overflow: 'hidden',
        background: '#ffffff',
        fontFamily: FONT,
      }}
    >
      <div style={{ display: 'flex', width: SHOT_WIDTH, height: STAGE_HEIGHT }}>{children}</div>
      <div
        style={{
          height: CAPTION_HEIGHT,
          background: '#eef2f7',
          borderTop: '1px solid #e3e8ef',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#0f172a',
          font: `500 17px/1 ${FONT}`,
          letterSpacing: '-0.005em',
        }}
      >
        {caption}
      </div>
    </div>
  );
}

function BrowserShot({
  caption,
  result,
  children,
}: {
  caption: string;
  result: AnalysisResult;
  children: ReactNode;
}) {
  return (
    <Shot caption={caption}>
      <MapsPage result={result} />
      <SidePanel height={STAGE_HEIGHT} docked>
        {children}
      </SidePanel>
    </Shot>
  );
}

// ---------------------------------------------------------------------------
// Brand mark for the promo tiles (same geometry as scripts/generate-icons.mjs).
// ---------------------------------------------------------------------------

const MARK_BARS: readonly [number, number, number, number][] = [
  [0.22, 0.36, 0.62, 0.8],
  [0.43, 0.57, 0.44, 0.8],
  [0.64, 0.78, 0.24, 0.8],
];

function BrandMark({ size, inverted = false }: { size: number; inverted?: boolean }) {
  const bg = inverted ? '#ffffff' : BRAND;
  const fg = inverted ? BRAND : '#ffffff';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" rx="22" fill={bg} />
      {MARK_BARS.map(([x0, x1, y0, y1]) => (
        <rect
          key={x0}
          x={x0 * 100}
          y={y0 * 100}
          width={(x1 - x0) * 100}
          height={(y1 - y0) * 100}
          fill={fg}
        />
      ))}
    </svg>
  );
}

function PromoBrand({
  width,
  mark,
  name,
  tagline,
  padding,
}: {
  width: number;
  mark: number;
  name: number;
  tagline: number;
  padding: number;
}) {
  return (
    <div
      style={{
        width,
        flex: 'none',
        background: BRAND,
        color: '#ffffff',
        padding: `0 ${padding}px`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <BrandMark size={mark} inverted />
      <div
        style={{
          marginTop: mark * 0.3,
          fontSize: name,
          fontWeight: 700,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
        }}
      >
        Signalyze
      </div>
      <div style={{ marginTop: tagline * 0.6, fontSize: tagline, lineHeight: 1.3, opacity: 0.92 }}>
        The statistics behind a star rating.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------

export const SCENES: Readonly<Record<string, Scene>> = {
  // Hero: badge on the page, score card with the mandatory sentence.
  '1': {
    width: SHOT_WIDTH,
    height: SHOT_HEIGHT,
    render: () => (
      <BrowserShot caption={CAPTIONS[1]} result={TEMPLATE}>
        <Result result={TEMPLATE} />
      </BrowserShot>
    ),
  },
  // Signal list; capture.mjs clicks "Burst ratio" to expand it.
  '2': {
    width: SHOT_WIDTH,
    height: SHOT_HEIGHT,
    render: () => (
      <BrowserShot caption={CAPTIONS[2]} result={BURST}>
        <SignalList signals={BURST.signals} />
      </BrowserShot>
    ),
  },
  // Charts: reviews per month with the burst, rating distribution, reviewer tiles.
  '3': {
    width: SHOT_WIDTH,
    height: SHOT_HEIGHT,
    render: () => (
      <BrowserShot caption={CAPTIONS[3]} result={BURST}>
        <MonthlyChart monthly={BURST.monthly} />
        <RatingChart distribution={BURST.ratingDistribution} />
        <ReviewerTiles profile={BURST.reviewerProfile} />
      </BrowserShot>
    ),
  },
  // Offline result. The signal list and the charts between the score card and
  // the reviewer tiles are hidden with CSS so both fit in one panel height.
  '4': {
    width: SHOT_WIDTH,
    height: SHOT_HEIGHT,
    render: () => (
      <div id="scene-4">
        <style>{`#scene-4 main > section:nth-of-type(2), #scene-4 main > section:nth-of-type(3), #scene-4 main > section:nth-of-type(4) { display: none; }`}</style>
        <BrowserShot caption={CAPTIONS[4]} result={NORMAL_OFFLINE}>
          <Result result={NORMAL_OFFLINE} fallbackReason="network" />
        </BrowserShot>
      </div>
    ),
  },
  // Consent screen next to the settings view.
  '5': {
    width: SHOT_WIDTH,
    height: SHOT_HEIGHT,
    render: () => (
      <Shot caption={CAPTIONS[5]}>
        <div
          style={{
            width: SHOT_WIDTH,
            height: STAGE_HEIGHT,
            background: 'linear-gradient(180deg, #f8fafc 0%, #e9eef5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 56,
          }}
        >
          <div>
            <p
              style={{
                margin: '0 0 10px 4px',
                font: `600 12px/1 ${FONT}`,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: MUTED,
              }}
            >
              First launch
            </p>
            <div
              className="bg-paper"
              style={{
                width: PANEL_WIDTH,
                height: 632,
                overflow: 'hidden',
                borderRadius: 12,
                border: '1px solid #e3e8ef',
                boxShadow: '0 8px 30px rgba(15, 23, 42, 0.16)',
              }}
            >
              <Onboarding onChoose={noop} />
            </div>
          </div>
          <div>
            <p
              style={{
                margin: '0 0 10px 4px',
                font: `600 12px/1 ${FONT}`,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: MUTED,
              }}
            >
              Settings
            </p>
            <SidePanel view="settings" height={632} frame>
              <SettingsView settings={SETTINGS} update={saveNoop} />
            </SidePanel>
          </div>
        </div>
      </Shot>
    ),
  },
  'promo-small': {
    width: 440,
    height: 280,
    render: () => (
      <div
        style={{
          width: 440,
          height: 280,
          display: 'flex',
          overflow: 'hidden',
          background: '#f4f6fa',
          fontFamily: FONT,
        }}
      >
        <PromoBrand width={172} padding={18} mark={44} name={24} tagline={12.5} />
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div
            style={{
              position: 'absolute',
              left: 14,
              top: -64,
              width: PANEL_WIDTH,
              transform: 'scale(0.66)',
              transformOrigin: 'top left',
            }}
          >
            <SidePanel height={640} frame>
              <Result result={TEMPLATE} />
            </SidePanel>
          </div>
        </div>
      </div>
    ),
  },
  'promo-marquee': {
    width: 1400,
    height: 560,
    render: () => (
      <div
        style={{
          width: 1400,
          height: 560,
          display: 'flex',
          overflow: 'hidden',
          background: '#f4f6fa',
          fontFamily: FONT,
        }}
      >
        <PromoBrand width={600} padding={64} mark={96} name={60} tagline={24} />
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 56, top: 36, width: PANEL_WIDTH }}>
            <SidePanel height={620} frame>
              <Result result={TEMPLATE} />
            </SidePanel>
          </div>
          <div
            style={{
              position: 'absolute',
              left: 470,
              top: 72,
              width: PANEL_WIDTH,
              transform: 'scale(0.86)',
              transformOrigin: 'top left',
            }}
          >
            <SidePanel height={620} frame>
              <MonthlyChart monthly={BURST.monthly} />
              <RatingChart distribution={BURST.ratingDistribution} />
              <ReviewerTiles profile={BURST.reviewerProfile} />
            </SidePanel>
          </div>
        </div>
      </div>
    ),
  },
};
