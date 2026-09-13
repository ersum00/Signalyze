import { useI18n } from '@/i18n/react';
import { BackIcon, GearIcon } from './ui';

export function Header({ view, onToggle }: { view: 'main' | 'settings'; onToggle: () => void }) {
  const { t } = useI18n();
  const inSettings = view === 'settings';
  return (
    <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-line bg-white/95 px-3 backdrop-blur">
      <div className="flex min-w-0 items-center gap-2">
        <img src="/icon/32.png" alt="" width="20" height="20" className="shrink-0 rounded-md" />
        <span className="truncate text-[14px] font-semibold tracking-tight text-ink-900">
          {inSettings ? t('settings.title') : 'Signalyze'}
        </span>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-label={inSettings ? t('nav.back') : t('nav.settings')}
        aria-pressed={inSettings}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-600 hover:bg-paper hover:text-ink-900"
      >
        {inSettings ? <BackIcon /> : <GearIcon />}
      </button>
    </header>
  );
}
