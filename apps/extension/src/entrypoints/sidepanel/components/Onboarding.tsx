import { PRIVACY_URL } from '@signalyze/shared';
import { useI18n } from '@/i18n/react';
import { Button, CheckIcon, CrossIcon, ExternalLink } from './ui';

export function Onboarding({ onChoose }: { onChoose: (allowSending: boolean) => void }) {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-5">
      <div className="flex items-center gap-2">
        <img src="/icon/32.png" alt="" width="22" height="22" className="rounded-md" />
        <span className="text-[13px] font-semibold text-ink-900">Signalyze</span>
        <span className="text-[12px] text-ink-400">{t('app.tagline')}</span>
      </div>

      <h1 className="mt-5 text-[19px] leading-tight font-semibold tracking-tight text-ink-900">
        {t('onboarding.title')}
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-600">{t('onboarding.intro')}</p>

      <div className="card mt-4 divide-y divide-line">
        <div className="flex gap-3 px-4 py-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <CheckIcon />
          </span>
          <div>
            <h2 className="text-[13px] font-semibold text-ink-900">{t('onboarding.sent.title')}</h2>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-600">
              {t('onboarding.sent.body')}
            </p>
          </div>
        </div>
        <div className="flex gap-3 px-4 py-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-paper text-ink-600">
            <CrossIcon />
          </span>
          <div>
            <h2 className="text-[13px] font-semibold text-ink-900">
              {t('onboarding.neverSent.title')}
            </h2>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-600">
              {t('onboarding.neverSent.body')}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-ink-600">{t('onboarding.hash')}</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-ink-600">{t('onboarding.server')}</p>

      <div className="mt-5 flex flex-col gap-2">
        <Button
          variant="primary"
          block
          onClick={() => {
            onChoose(true);
          }}
        >
          {t('onboarding.allow')}
        </Button>
        <Button
          variant="secondary"
          block
          onClick={() => {
            onChoose(false);
          }}
        >
          {t('onboarding.localOnly')}
        </Button>
      </div>

      <p className="mt-4 text-[11.5px] text-ink-400">
        {t('onboarding.changeLater')}{' '}
        <ExternalLink href={PRIVACY_URL}>{t('onboarding.privacyLink')}</ExternalLink>
      </p>
    </main>
  );
}
