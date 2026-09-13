import type { MonthlyCount, RatingDistribution } from '@signalyze/shared';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { useI18n } from '@/i18n/react';
import { formatMonth, formatMonthShort, formatShare } from '@/lib/format';
import { Section } from './ui';

// One hue for one series; the busiest month is the only emphasised mark.
const BRAND = '#2563eb';
const BRAND_DARK = '#1e40af';
const GRID = '#e3e8ef';
const TICK = '#94a3b8';
const HOVER = '#eef6ff';

interface MonthRow {
  month: string;
  label: string;
  count: number;
}

function MonthTooltip({ active, payload }: TooltipProps<number, string>) {
  const { tp, locale } = useI18n();
  if (active !== true || payload === undefined || payload.length === 0) return null;
  const row = payload[0]?.payload as MonthRow | undefined;
  if (row === undefined) return null;
  return (
    <div className="rounded-md border border-line bg-white px-2 py-1 text-[11px] text-ink-900 shadow-sm">
      <span className="text-ink-600">{formatMonth(row.month, locale)}</span>
      {' · '}
      <span className="font-semibold tabular-nums">{tp('charts.monthly.tooltip', row.count)}</span>
    </div>
  );
}

export function MonthlyChart({ monthly }: { monthly: readonly MonthlyCount[] }) {
  const { t, locale } = useI18n();
  const rows = useMemo<MonthRow[]>(
    () =>
      monthly.map((m) => ({
        month: m.month,
        label: formatMonthShort(m.month, locale),
        count: m.count,
      })),
    [monthly, locale],
  );
  const busiest = rows.reduce(
    (best, row, index) => (row.count > (rows[best]?.count ?? -1) ? index : best),
    0,
  );
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <Section title={t('charts.monthly.title')} className="mt-3">
      {rows.length === 0 || total === 0 ? (
        <p className="px-4 pb-3 text-[12px] text-ink-400">{t('charts.empty')}</p>
      ) : (
        <div className="px-2 pt-1 pb-2">
          <ResponsiveContainer width="100%" height={132}>
            <BarChart
              data={rows}
              margin={{ top: 6, right: 6, left: 0, bottom: 0 }}
              barCategoryGap="22%"
            >
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={18}
                tick={{ fontSize: 10, fill: TICK }}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                width={28}
                tick={{ fontSize: 10, fill: TICK }}
              />
              <Tooltip content={<MonthTooltip />} cursor={{ fill: HOVER }} />
              <Bar
                dataKey="count"
                fill={BRAND}
                radius={[3, 3, 0, 0]}
                maxBarSize={24}
                isAnimationActive={false}
              >
                {rows.map((row, index) => (
                  <Cell key={row.month} fill={index === busiest ? BRAND_DARK : BRAND} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Section>
  );
}

interface RatingRow {
  stars: number;
  label: string;
  count: number;
  shareLabel: string;
}

export function RatingChart({ distribution }: { distribution: RatingDistribution }) {
  const { t, locale } = useI18n();
  const total =
    distribution[1] + distribution[2] + distribution[3] + distribution[4] + distribution[5];
  const rows = useMemo<RatingRow[]>(
    () =>
      ([5, 4, 3, 2, 1] as const).map((stars) => ({
        stars,
        label: t('charts.rating.tick', { count: stars }),
        count: distribution[stars],
        shareLabel: total > 0 ? formatShare(distribution[stars] / total, locale) : '',
      })),
    [distribution, total, t, locale],
  );

  return (
    <Section title={t('charts.rating.title')} className="mt-3">
      {total === 0 ? (
        <p className="px-4 pb-3 text-[12px] text-ink-400">{t('charts.empty')}</p>
      ) : (
        <div className="px-2 pt-1 pb-2">
          <ResponsiveContainer width="100%" height={124}>
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 2, right: 44, left: 4, bottom: 2 }}
              barCategoryGap="28%"
            >
              <XAxis type="number" hide domain={[0, 'dataMax']} />
              <YAxis
                type="category"
                dataKey="label"
                axisLine={false}
                tickLine={false}
                width={36}
                tick={{ fontSize: 11, fill: '#475569' }}
              />
              <Bar
                dataKey="count"
                fill={BRAND}
                radius={[0, 3, 3, 0]}
                maxBarSize={14}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="shareLabel"
                  position="right"
                  style={{ fontSize: 11, fill: '#475569' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Section>
  );
}
