import {
  EXTENDED_REVIEW_LIMIT,
  MIN_REVIEWS_FOR_SCORE,
  type AnalysisResult,
} from '@signalyze/shared';
import type { PlaceContext } from '@/adapters/google-maps';
import { useI18n } from '@/i18n/react';
import { formatDateTime } from '@/lib/format';
import type { CollectOutcome } from '@/lib/messages';
import { MonthlyChart, RatingChart } from './Charts';
import { PlaceCard } from './PlaceCard';
import { ReviewerTiles } from './ReviewerTiles';
import { ScoreRing } from './ScoreRing';
import { SignalList } from './SignalList';
import { Button, Notice } from './ui';

export function ResultView({
  context,
  result,
  fallbackReason,
  collectStatus,
  limit,
  onAnalyze,
}: {
  context: PlaceContext;
  result: AnalysisResult;
  fallbackReason: string | null;
  collectStatus: CollectOutcome | 'cached';
  limit: number;
  onAnalyze: (limit: number) => void;
}) {
  const { t, locale } = useI18n();
  const total = context.totalReviewCount;
  const analysed =
    total !== null && total >= result.reviewCount
      ? t('result.analysed', { analysed: result.reviewCount, total })
      : t('result.analysedNoTotal', { analysed: result.reviewCount });
  const canLoadMore =
    limit < EXTENDED_REVIEW_LIMIT &&
    collectStatus !== 'exhausted' &&
    (total === null || total > result.reviewCount);

  return (
    <>
      <PlaceCard context={context} />

      {result.score === null ? (
        <Notice
          title={t('state.insufficient.title')}
          body={t('state.insufficient.body', {
            count: result.reviewCount,
            min: MIN_REVIEWS_FOR_SCORE,
          })}
        >
          {canLoadMore && (
            <Button
              variant="primary"
              onClick={() => {
                onAnalyze(EXTENDED_REVIEW_LIMIT);
              }}
            >
              {t('home.loadMore', { limit: EXTENDED_REVIEW_LIMIT })}
            </Button>
          )}
        </Notice>
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
                  className={`inline-block h-1.5 w-1.5 rounded-full ${result.source === 'offline' ? 'bg-ink-400' : 'bg-brand-500'}`}
                  aria-hidden="true"
                />
                {t(`result.source.${result.source}`)}
              </p>
            </div>
          </div>
          <p className="mt-4 border-t border-line pt-3 text-[11.5px] leading-relaxed text-ink-600">
            {t('result.mandatory')}
          </p>
          {fallbackReason !== null && (
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-400">
              {t('result.fallback')}
            </p>
          )}
          {collectStatus === 'exhausted' && (
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
              onAnalyze(limit);
            }}
          >
            {t('result.reanalyze')}
          </Button>
          {canLoadMore && result.score !== null && (
            <Button
              variant="ghost"
              onClick={() => {
                onAnalyze(EXTENDED_REVIEW_LIMIT);
              }}
            >
              {t('home.loadMore', { limit: EXTENDED_REVIEW_LIMIT })}
            </Button>
          )}
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
