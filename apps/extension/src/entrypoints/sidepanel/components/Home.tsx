import { DEFAULT_REVIEW_LIMIT, EXTENDED_REVIEW_LIMIT } from '@signalyze/shared';
import type { PlaceContext } from '@/adapters/google-maps';
import { useI18n } from '@/i18n/react';
import { formatDateTime } from '@/lib/format';
import type { CachedResult } from '@/lib/storage';
import { PlaceCard } from './PlaceCard';
import { Button } from './ui';

export function Home({
  context,
  cached,
  notice,
  onAnalyze,
  onShowCached,
}: {
  context: PlaceContext;
  cached: CachedResult | null;
  notice?: 'cancelled';
  onAnalyze: (limit: number) => void;
  onShowCached: () => void;
}) {
  const { t, locale } = useI18n();
  return (
    <>
      <PlaceCard context={context} />

      {notice === 'cancelled' && (
        <p className="mb-3 rounded-lg bg-white px-3 py-2 text-[12px] text-ink-600 ring-1 ring-line">
          {t('state.cancelled')}
        </p>
      )}

      {cached !== null && (
        <section className="card mb-3 flex items-center gap-3 px-4 py-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[17px] font-semibold text-brand-700">
            {cached.result.score === null ? t('reviewers.na') : Math.round(cached.result.score)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-medium text-ink-900">
              {t('home.cached.title', { date: formatDateTime(cached.storedAt, locale) })}
            </p>
            <button
              type="button"
              onClick={onShowCached}
              className="mt-0.5 text-[12.5px] font-semibold text-brand-700 hover:underline"
            >
              {t('home.cached.show')}
            </button>
          </div>
        </section>
      )}

      <section className="card px-4 py-4">
        <Button
          variant="primary"
          block
          onClick={() => {
            onAnalyze(DEFAULT_REVIEW_LIMIT);
          }}
        >
          {cached === null
            ? t('home.analyzeLimit', { limit: DEFAULT_REVIEW_LIMIT })
            : t('home.cached.refresh')}
        </Button>
        <Button
          variant="ghost"
          block
          className="mt-1.5"
          onClick={() => {
            onAnalyze(EXTENDED_REVIEW_LIMIT);
          }}
        >
          {t('home.loadMore', { limit: EXTENDED_REVIEW_LIMIT })}
        </Button>
        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-400">
          {t('home.analyzeHint', { limit: DEFAULT_REVIEW_LIMIT })}
        </p>
      </section>
    </>
  );
}
