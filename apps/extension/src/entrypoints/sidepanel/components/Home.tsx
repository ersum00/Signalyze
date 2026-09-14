import {
  ALL_REVIEWS_CEILING,
  ANALYSIS_WINDOWS,
  SAMPLE_LIMITS,
  isAnalysisWindow,
  isSampleLimit,
} from '@signalyze/shared';
import type { PlaceContext } from '@/adapters/google-maps';
import { useI18n } from '@/i18n/react';
import { formatDateTime, formatNumber } from '@/lib/format';
import { scopeOf, type AnalysisScope } from '@/lib/scope';
import type { CachedResult, Settings } from '@/lib/storage';
import { PlaceCard } from './PlaceCard';
import { Button } from './ui';

const SELECT_CLASS =
  'mt-1 h-8 w-full rounded-md border border-line bg-white px-2 text-[12.5px] text-ink-900';

export function Home({
  context,
  cached,
  notice,
  settings,
  update,
  onAnalyze,
  onShowCached,
}: {
  context: PlaceContext;
  cached: CachedResult | null;
  notice?: 'cancelled';
  settings: Settings;
  update: (patch: Partial<Settings>) => Promise<void>;
  onAnalyze: (scope: AnalysisScope) => void;
  onShowCached: () => void;
}) {
  const { t, locale } = useI18n();
  const scope = scopeOf(settings);
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
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[11px] font-medium text-ink-600">{t('home.scope.limit')}</span>
            <select
              value={String(settings.sampleLimit)}
              aria-label={t('home.scope.limit')}
              onChange={(event) => {
                const raw = event.target.value;
                const value = raw === 'all' ? 'all' : Number(raw);
                if (isSampleLimit(value)) void update({ sampleLimit: value });
              }}
              className={SELECT_CLASS}
            >
              {SAMPLE_LIMITS.map((limit) => (
                <option key={limit} value={String(limit)}>
                  {formatNumber(limit, locale)}
                </option>
              ))}
              <option value="all">{t('home.scope.all', { ceiling: ALL_REVIEWS_CEILING })}</option>
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-ink-600">{t('home.scope.window')}</span>
            <select
              value={settings.window}
              aria-label={t('home.scope.window')}
              onChange={(event) => {
                const value = event.target.value;
                if (isAnalysisWindow(value)) void update({ window: value });
              }}
              className={SELECT_CLASS}
            >
              {ANALYSIS_WINDOWS.map((window) => (
                <option key={window} value={window}>
                  {t(`window.${window}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Button
          variant="primary"
          block
          className="mt-3"
          onClick={() => {
            onAnalyze(scope);
          }}
        >
          {cached === null ? t('home.analyze') : t('home.cached.refresh')}
        </Button>
        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-400">{t('home.scope.hint')}</p>
        {scope.window !== 'all' && (
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-400">
            {t('home.scope.windowHint')}
          </p>
        )}
      </section>
    </>
  );
}
