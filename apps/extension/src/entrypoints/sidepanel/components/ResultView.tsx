import { MIN_REVIEWS_FOR_SCORE, type AnalysisResult } from '@signalyze/shared';
import type { PlaceContext } from '@/adapters/google-maps';
import { useI18n } from '@/i18n/react';
import { signalName } from '@/lib/explain';
import { formatDateTime } from '@/lib/format';
import type { CollectOutcome } from '@/lib/messages';
import { MAX_SIGNAL_POINTS, contributions, scoreBand } from '@/lib/reading';
import type { AnalysisScope } from '@/lib/scope';
import { MonthlyChart, RatingChart } from './Charts';
import { PlaceCard } from './PlaceCard';
import { ReviewerTiles } from './ReviewerTiles';
import { ScoreRing } from './ScoreRing';
import { SignalList } from './SignalList';
import { Button, Notice } from './ui';

/** How many contributing signals the score card lists. */
const TOP_CONTRIBUTORS = 3;

export function ResultView({
  context,
  result,
  fallbackReason,
  collectStatus,
  scope,
  sortedByNewest,
  loaded,
  onAnalyze,
}: {
  context: PlaceContext;
  result: AnalysisResult;
  fallbackReason: string | null;
  collectStatus: CollectOutcome | 'cached';
  scope: AnalysisScope;
  sortedByNewest: boolean;
  /** Reviews read from the page before the period filter. */
  loaded: number;
  onAnalyze: (scope: AnalysisScope) => void;
}) {
  const { t, locale } = useI18n();
  const windowed = scope.window !== 'all';
  const period = t(`window.${scope.window}`);
  const total = context.totalReviewCount;
  const analysed = windowed
    ? t('result.window.analysed', { period, inWindow: result.reviewCount, loaded })
    : total !== null && total >= result.reviewCount
      ? t('result.analysed', { analysed: result.reviewCount, total })
      : t('result.analysedNoTotal', { analysed: result.reviewCount });
  const top = contributions(result.signals).slice(0, TOP_CONTRIBUTORS);

  return (
    <>
      <PlaceCard context={context} />

      {result.score === null ? (
        <Notice
          title={t('state.insufficient.title')}
          body={
            windowed
              ? t('state.insufficient.window', {
                  period,
                  count: result.reviewCount,
                  min: MIN_REVIEWS_FOR_SCORE,
                })
              : t('state.insufficient.body', {
                  count: result.reviewCount,
                  min: MIN_REVIEWS_FOR_SCORE,
                })
          }
        />
      ) : (
        <section className="card px-4 py-4">
          <div className="flex items-center gap-4">
            <ScoreRing score={result.score} label={t('result.scoreLabel')} />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-ink-900">{t('result.scoreLabel')}</p>
              <p className="text-[11px] text-ink-400">{t('result.scoreRange')}</p>
              <p className="mt-2 text-[12px] text-ink-600 tabular-nums">{analysed}</p>
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-[11.5px] text-ink-600">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${windowed || result.source === 'offline' ? 'bg-ink-400' : 'bg-brand-500'}`}
                  aria-hidden="true"
                />
                {windowed ? t('result.source.window') : t(`result.source.${result.source}`)}
              </p>
            </div>
          </div>

          <p className="mt-4 text-[13px] leading-relaxed font-medium text-ink-900">
            {t(`result.reading.${scoreBand(result.score)}`)}
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-400">
            {t('result.scale', { max: MAX_SIGNAL_POINTS })}
          </p>

          <div className="mt-3">
            <p className="text-[11px] font-semibold tracking-wide text-ink-600 uppercase">
              {t('result.contributors.title')}
            </p>
            {top.length === 0 ? (
              <p className="mt-1 text-[12px] text-ink-600">{t('result.contributors.none')}</p>
            ) : (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {top.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-full bg-paper px-2.5 py-1 text-[12px] text-ink-900 tabular-nums"
                  >
                    {t('result.contributors.item', {
                      name: signalName(item.id, locale),
                      points: item.points,
                    })}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-4 border-t border-line pt-3 text-[11.5px] leading-relaxed text-ink-600">
            {t('result.mandatory')}
          </p>
          {fallbackReason !== null && !windowed && (
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-400">
              {t('result.fallback')}
            </p>
          )}
          {windowed && (
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-400">
              {t('home.scope.windowHint')}
            </p>
          )}
          {windowed && !sortedByNewest && (
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-400">
              {t('result.window.notSorted')}
            </p>
          )}
          {collectStatus === 'exhausted' && !windowed && (
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-400">
              {t('result.collect.exhausted')}
            </p>
          )}
        </section>
      )}

      {result.signals.length > 0 && <SignalList signals={result.signals} />}
      {result.score !== null && (
        <>
          <MonthlyChart monthly={result.monthly} />
          <RatingChart distribution={result.ratingDistribution} />
          <ReviewerTiles profile={result.reviewerProfile} />
        </>
      )}

      <footer className="mt-4 mb-2 flex flex-col gap-2 px-1">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              onAnalyze(scope);
            }}
          >
            {t('result.reanalyze')}
          </Button>
        </div>
        <p className="text-[11px] text-ink-400 tabular-nums">
          {t('result.computedAt', { date: formatDateTime(result.computedAt, locale) })}
          {' · '}
          {t('settings.engine', { version: result.engineVersion })}
        </p>
      </footer>
    </>
  );
}
