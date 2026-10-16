'use client';

import type { MailLogRow } from '@opchub/shared/api-domains';
import { ErrorState, PageSkeleton } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useCampaignFlow } from '../hooks/use-campaign-flow';
import { useCampaigns, useMailLog, useMarketingSummary } from '../hooks/use-marketing';
import { useMarketingParams } from '../hooks/use-marketing-params';
import { AutoPanel } from './auto-panel';
import { CampaignForm } from './campaign-form';
import { CampaignTable } from './campaign-table';
import { ConfirmDialog } from './confirm-dialog';
import { MailLog } from './mail-log';
import { MailViewDialog } from './mail-view-dialog';
import { MarketingHeader, MarketingStats, MarketingTabs } from './marketing-head';
import styles from './marketing.module.css';

/** D-78 / D-79 Admin Marketing (orchestrator) — D-33: mục menu riêng */
export function MarketingScreen() {
  const t = useTranslations('marketing');
  const { params, update } = useMarketingParams();
  const summary = useMarketingSummary();
  const camps = useCampaigns(params.tab === 'campaigns');
  const log = useMailLog(params.tab === 'log');
  const flow = useCampaignFlow();
  const [viewing, setViewing] = useState<MailLogRow | null>(null);

  const q = params.tab === 'campaigns' ? camps : params.tab === 'log' ? log : null;
  let panel;
  if (q?.isError)
    panel = (
      <ErrorState title={t('loadError')} retryLabel={t('retry')} onRetry={() => void q.refetch()} />
    );
  else if (params.tab === 'auto')
    panel = <AutoPanel onSave={flow.act.onSaveWelcome} onTest={flow.act.onTestWelcome} />;
  else if (params.tab === 'log')
    panel = log.data ? (
      <MailLog items={log.data} onView={setViewing} onResend={flow.act.onResend} />
    ) : (
      <PageSkeleton />
    );
  else
    panel = camps.data ? (
      <CampaignTable items={camps.data} act={flow.rowActions} />
    ) : (
      <PageSkeleton />
    );

  return (
    <>
      <MarketingHeader />
      <div data-screen-label="Admin · Marketing" className={styles.screen}>
        <MarketingStats summary={summary.data} />
        <div className={styles.card}>
          <MarketingTabs
            tab={params.tab}
            onTab={(tab) => update({ tab })}
            onCreate={flow.openNew}
          />
          <div
            className={styles.body}
            id="mk-panel"
            role="tabpanel"
            aria-labelledby={`mk-tab-${params.tab}`}
          >
            {panel}
          </div>
        </div>
      </div>
      <CampaignForm
        initial={flow.form}
        busy={flow.busy}
        onClose={flow.closeForm}
        onSubmit={flow.submit}
        onConfirm={flow.setConfirm}
      />
      <MailViewDialog row={viewing} onClose={() => setViewing(null)} />
      <ConfirmDialog req={flow.confirm} busy={flow.busy} onClose={flow.closeConfirm} />
    </>
  );
}
