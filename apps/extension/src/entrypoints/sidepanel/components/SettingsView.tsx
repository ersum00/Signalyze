import { METHODOLOGY_URL, PRIVACY_URL, SUPPORTED_LOCALES } from '@signalyze/shared';
import { ENGINE_VERSION } from '@signalyze/signals';
import { useEffect, useState, type ReactNode } from 'react';
import { browser } from 'wxt/browser';
import { useI18n } from '@/i18n/react';
import { formatDateTime } from '@/lib/format';
import { cacheSize, clearCache, type LocaleSetting, type Settings } from '@/lib/storage';
import { Button, ExternalLink, Switch } from './ui';

const LOCALE_OPTIONS: readonly LocaleSetting[] = ['auto', ...SUPPORTED_LOCALES];

function isLocaleSetting(value: string): value is LocaleSetting {
  return (LOCALE_OPTIONS as readonly string[]).includes(value);
}

function Row({
  label,
  help,
  control,
  children,
}: {
  label: string;
  help?: string;
  control: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink-900">{label}</p>
        {help !== undefined && (
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-600">{help}</p>
        )}
        {children}
      </div>
      <div className="shrink-0 pt-0.5">{control}</div>
    </div>
  );
}

export function SettingsView({
  settings,
  update,
}: {
  settings: Settings;
  update: (patch: Partial<Settings>) => Promise<void>;
}) {
  const { t, tp, locale } = useI18n();
  const [count, setCount] = useState<number | null>(null);
  const [cleared, setCleared] = useState(false);
  const version = browser.runtime.getManifest().version;

  useEffect(() => {
    let active = true;
    cacheSize()
      .then((n) => {
        if (active) setCount(n);
      })
      .catch(() => {
        if (active) setCount(null);
      });
    return () => {
      active = false;
    };
  }, [cleared]);

  return (
    <div className="flex flex-col gap-3">
      <section className="card divide-y divide-line">
        <Row
          label={t('settings.language')}
          control={
            <select
              value={settings.locale}
              aria-label={t('settings.language')}
              onChange={(event) => {
                const value = event.target.value;
                if (isLocaleSetting(value)) void update({ locale: value });
              }}
              className="h-8 rounded-md border border-line bg-white px-2 text-[12.5px] text-ink-900"
            >
              {LOCALE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {t(`settings.language.${option}`)}
                </option>
              ))}
            </select>
          }
        />
        <Row
          label={t('settings.badge')}
          help={t('settings.badge.help')}
          control={
            <Switch
              checked={settings.badgeEnabled}
              label={t('settings.badge')}
              onChange={(next) => {
                void update({ badgeEnabled: next });
              }}
            />
          }
        />
        <Row
          label={t('settings.sendToServer')}
          help={t('settings.sendToServer.help')}
          control={
            <Switch
              checked={settings.sendToServer}
              label={t('settings.sendToServer')}
              onChange={(next) => {
                void update({
                  sendToServer: next,
                  consentGivenAt: next ? new Date().toISOString() : settings.consentGivenAt,
                });
              }}
            />
          }
        >
          {settings.consentGivenAt !== null && (
            <p className="mt-1 text-[11px] text-ink-400 tabular-nums">
              {t('settings.consentGiven', {
                date: formatDateTime(settings.consentGivenAt, locale),
              })}
            </p>
          )}
        </Row>
      </section>

      <section className="card flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-[13px] font-medium text-ink-900">{t('settings.clearCache')}</p>
          <p className="mt-0.5 text-[11.5px] text-ink-600 tabular-nums">
            {cleared
              ? t('settings.clearCache.done')
              : count === null
                ? ''
                : tp('settings.cacheCount', count)}
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={count === 0}
          onClick={() => {
            clearCache()
              .then(() => {
                setCleared(true);
              })
              .catch(() => {
                setCleared(false);
              });
          }}
        >
          {t('settings.clearCache')}
        </Button>
      </section>

      <section className="px-1 text-[11.5px] leading-relaxed text-ink-600">
        <p className="flex flex-wrap gap-x-3 gap-y-1">
          <ExternalLink href={PRIVACY_URL}>{t('settings.privacy')}</ExternalLink>
          <ExternalLink href={METHODOLOGY_URL}>{t('settings.methodology')}</ExternalLink>
        </p>
        <p className="mt-2 text-ink-400 tabular-nums">
          {t('settings.version', { version })}
          {' · '}
          {t('settings.engine', { version: ENGINE_VERSION })}
        </p>
        <p className="mt-2 text-ink-400">{t('settings.about')}</p>
      </section>
    </div>
  );
}
