import type { PlaceContext } from '@/adapters/google-maps';
import { useI18n } from '@/i18n/react';
import { PlaceCard } from './PlaceCard';
import { Button } from './ui';

export function Collecting({
  context,
  count,
  limit,
  analyzing,
  onCancel,
}: {
  context: PlaceContext;
  count: number;
  limit: number;
  analyzing: boolean;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const ratio = limit > 0 ? Math.min(1, count / limit) : 0;
  return (
    <>
      <PlaceCard context={context} />
      <section className="card px-4 py-4" aria-live="polite">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink-900">
            <span className="spinner" aria-hidden="true" />
            {analyzing ? t('collecting.analyzing') : t('collecting.title')}
          </h2>
          {!analyzing && (
            <span className="text-[12px] text-ink-600 tabular-nums">
              {t('collecting.progress', { count, limit })}
            </span>
          )}
        </div>
        <div
          className="meter mt-3"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuenow={analyzing ? limit : count}
        >
          <span
            className="meter-fill"
            style={{ width: `${Math.round((analyzing ? 1 : ratio) * 100)}%` }}
          />
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-400">{t('collecting.hint')}</p>
        {!analyzing && (
          <Button variant="secondary" className="mt-3" onClick={onCancel}>
            {t('collecting.cancel')}
          </Button>
        )}
      </section>
    </>
  );
}
