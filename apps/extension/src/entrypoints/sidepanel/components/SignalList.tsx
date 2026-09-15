import { METHODOLOGY_URL, SIGNAL_DEFINITIONS, type SignalResult } from '@signalyze/shared';
import { useState } from 'react';
import { useI18n } from '@/i18n/react';
import {
  signalBaseline,
  signalLookAt,
  signalName,
  signalPlain,
  signalShort,
  signalWhy,
} from '@/lib/explain';
import { formatShare, formatSignalValue, percent } from '@/lib/format';
import { ChevronIcon, ExternalLink, Section } from './ui';

function SignalRow({ signal }: { signal: SignalResult }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const definition = SIGNAL_DEFINITIONS[signal.id];
  const name = signalName(signal.id, locale);
  const unusualness = signal.available ? signal.unusualness : 0;

  return (
    <li className="border-t border-line">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
        }}
        className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left hover:bg-paper/70"
      >
        <span className={`mt-[3px] shrink-0 ${signal.available ? 'text-ink-400' : 'text-ink-300'}`}>
          <ChevronIcon open={open} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span
              className={`truncate text-[13px] font-medium ${signal.available ? 'text-ink-900' : 'text-ink-400'}`}
            >
              {name}
            </span>
            <span className="shrink-0 text-[12px] text-ink-600 tabular-nums">
              {signal.available
                ? formatSignalValue(signal.value, definition.valueFormat, locale)
                : t('signals.unavailable')}
            </span>
          </span>
          <span className="meter mt-1.5" aria-hidden="true">
            <span className="meter-fill" style={{ width: `${percent(unusualness)}%` }} />
          </span>
          <span className="mt-1 block text-[11px] text-ink-400 tabular-nums">
            {t('signals.distance')}: {signal.available ? formatShare(unusualness, locale) : '–'}
          </span>
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3 pl-[42px] text-[12px] leading-relaxed">
          <p className="text-ink-400">{signalShort(signal.id, locale)}</p>
          <p className="mt-1.5 text-ink-900">{signalPlain(signal, locale)}</p>
          {signal.available && (
            <p className="mt-1.5 text-ink-600">{signalBaseline(signal.id, locale)}</p>
          )}
          <p className="mt-1.5 text-ink-600">
            <span className="font-medium text-ink-700">{t('signals.lookAt')}: </span>
            {signalLookAt(signal.id, locale)}
          </p>
          <p className="mt-1.5 text-ink-600">
            <span className="font-medium text-ink-700">{t('signals.why')}: </span>
            {signalWhy(signal.id, locale)}
          </p>
          <ExternalLink href={METHODOLOGY_URL} className="mt-2 text-[12px] font-medium">
            {t('signals.methodology')}
          </ExternalLink>
        </div>
      )}
    </li>
  );
}

export function SignalList({ signals }: { signals: readonly SignalResult[] }) {
  const { t } = useI18n();
  const available = signals.filter((s) => s.available).length;
  return (
    <Section
      title={t('signals.title')}
      meta={t('signals.available', { available, total: signals.length })}
      className="mt-3"
    >
      <p className="px-4 pb-1 text-[11px] text-ink-400">{t('signals.legend')}</p>
      <ul className="mt-1">
        {signals.map((signal) => (
          <SignalRow key={signal.id} signal={signal} />
        ))}
      </ul>
    </Section>
  );
}
