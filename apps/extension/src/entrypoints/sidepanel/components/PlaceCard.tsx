import type { PlaceContext } from '@/adapters/google-maps';
import { useI18n } from '@/i18n/react';
import { formatRating } from '@/lib/format';

export function PlaceCard({ context }: { context: PlaceContext }) {
  const { t, tp, locale } = useI18n();
  const parts: string[] = [];
  if (context.overallRating !== null) {
    parts.push(t('home.place.rating', { rating: formatRating(context.overallRating, locale) }));
  }
  if (context.totalReviewCount !== null) {
    parts.push(tp('home.place.reviews', context.totalReviewCount));
  }
  return (
    <div className="px-1 pb-3">
      <p className="truncate text-[15px] leading-tight font-semibold text-ink-900">
        {context.name ?? t('home.place.noName')}
      </p>
      <p className="mt-0.5 text-[12px] text-ink-600 tabular-nums">
        {parts.length > 0 ? parts.join(' · ') : t('home.place.noRating')}
      </p>
    </div>
  );
}
