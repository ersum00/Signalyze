import { useEffect, useMemo, useState } from 'react';
import { detectUiLocale, resolveLocale } from '@/i18n';
import { I18nProvider } from '@/i18n/react';
import { Header } from './components/Header';
import { MainView } from './components/MainView';
import { Onboarding } from './components/Onboarding';
import { SettingsView } from './components/SettingsView';
import { useAnalysis } from './hooks/useAnalysis';
import { useSettings } from './hooks/useSettings';

export function App() {
  const { settings, update } = useSettings();
  const analysis = useAnalysis(settings);
  const [view, setView] = useState<'main' | 'settings'>('main');
  const locale = useMemo(
    () => (settings === null ? detectUiLocale() : resolveLocale(settings)),
    [settings],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  if (settings === null) {
    return <div className="min-h-screen bg-paper" aria-busy="true" />;
  }

  return (
    <I18nProvider locale={locale}>
      {settings.onboardingDone ? (
        <div className="flex min-h-screen flex-col bg-paper">
          <Header
            view={view}
            onToggle={() => {
              setView((current) => (current === 'main' ? 'settings' : 'main'));
            }}
          />
          <main className="flex-1 px-3 pt-3 pb-4">
            {view === 'settings' ? (
              <SettingsView settings={settings} update={update} />
            ) : (
              <MainView analysis={analysis} settings={settings} update={update} />
            )}
          </main>
        </div>
      ) : (
        <Onboarding
          onChoose={(allowSending) => {
            void update({
              onboardingDone: true,
              sendToServer: allowSending,
              consentGivenAt: allowSending ? new Date().toISOString() : null,
            });
          }}
        />
      )}
    </I18nProvider>
  );
}
