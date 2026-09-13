import { useI18n } from '@/i18n/react';
import type { AnalysisController } from '../hooks/useAnalysis';
import { Collecting } from './Collecting';
import { Home } from './Home';
import { PlaceCard } from './PlaceCard';
import { ResultView } from './ResultView';
import { Button, Notice } from './ui';

export function MainView({ analysis }: { analysis: AnalysisController }) {
  const { t } = useI18n();
  const { phase } = analysis;

  switch (phase.kind) {
    case 'loading':
      return <div className="h-24" aria-busy="true" />;
    case 'no_tab':
      return <Notice title={t('home.noTab.title')} body={t('home.noTab.body')} />;
    case 'no_place':
      return <Notice title={t('home.noPlace.title')} body={t('home.noPlace.body')} />;
    case 'no_script':
      return <Notice title={t('home.noScript.title')} body={t('home.noScript.body')} />;
    case 'layout_changed':
      return <Notice title={t('state.layout.title')} body={t('state.layout.body')} />;
    case 'ready':
      return phase.notice === undefined ? (
        <Home
          context={phase.context}
          cached={phase.cached}
          onAnalyze={analysis.analyze}
          onShowCached={analysis.showCached}
        />
      ) : (
        <Home
          context={phase.context}
          cached={phase.cached}
          notice={phase.notice}
          onAnalyze={analysis.analyze}
          onShowCached={analysis.showCached}
        />
      );
    case 'collecting':
      return (
        <Collecting
          context={phase.context}
          count={phase.count}
          limit={phase.limit}
          analyzing={false}
          onCancel={analysis.cancel}
        />
      );
    case 'analyzing':
      return (
        <Collecting
          context={phase.context}
          count={phase.limit}
          limit={phase.limit}
          analyzing
          onCancel={analysis.cancel}
        />
      );
    case 'result':
      return (
        <ResultView
          context={phase.context}
          result={phase.result}
          fallbackReason={phase.fallbackReason}
          collectStatus={phase.collectStatus}
          limit={phase.limit}
          onAnalyze={analysis.analyze}
        />
      );
    case 'error':
      return (
        <>
          <PlaceCard context={phase.context} />
          <Notice title={t('state.error.title')} body={t('state.error.body')}>
            <Button variant="primary" onClick={analysis.back}>
              {t('state.retry')}
            </Button>
          </Notice>
        </>
      );
  }
}
