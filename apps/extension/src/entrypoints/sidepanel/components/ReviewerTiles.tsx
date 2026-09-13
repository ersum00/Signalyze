import type { ReviewerProfileSummary } from '@signalyze/shared';
import { useI18n } from '@/i18n/react';
import { formatNumber, formatShare } from '@/lib/format';
import { Section } from './ui';

export function ReviewerTiles({ profile }: { profile: ReviewerProfileSummary }) {
  const { t, locale } = useI18n();
  const na = t('reviewers.na');
  const share = (value: number | null): string =>
    value === null ? na : formatShare(value, locale);
  const tiles: { key: string; label: string; value: string }[] = [
    {
      key: 'single',
      label: t('reviewers.singleReviewShare'),
      value: share(profile.singleReviewShare),
    },
    {
      key: 'median',
      label: t('reviewers.medianReviewCount'),
      value:
        profile.medianReviewCount === null
          ? na
          : formatNumber(profile.medianReviewCount, locale, { maximumFractionDigits: 1 }),
    },
    { key: 'guides', label: t('reviewers.localGuideShare'), value: share(profile.localGuideShare) },
    { key: 'photos', label: t('reviewers.withPhotosShare'), value: share(profile.withPhotosShare) },
  ];
  return (
    <Section title={t('reviewers.title')} className="mt-3">
      <dl className="grid grid-cols-2 gap-2 px-4 pt-1 pb-3">
        {tiles.map((tile) => (
          <div key={tile.key} className="rounded-lg bg-paper px-3 py-2">
            <dd className="text-[17px] leading-tight font-semibold text-ink-900">{tile.value}</dd>
            <dt className="mt-0.5 text-[11px] leading-tight text-ink-600">{tile.label}</dt>
          </div>
        ))}
      </dl>
      <p className="px-4 pb-3 text-[11px] leading-relaxed text-ink-400">{t('reviewers.note')}</p>
    </Section>
  );
}
