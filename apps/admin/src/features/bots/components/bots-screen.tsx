'use client';

import { ErrorState, Icon, PageHeader, PageSkeleton } from '@opchub/ui';
import { useIsMutating } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useBotActions } from '../hooks/use-bot-actions';
import { botEmergencyKey } from '../hooks/use-bot-emergency';
import { useBotData } from '../hooks/use-bot-data';
import { useBotRoute } from '../hooks/use-bot-route';
import { botStats } from '../model';
import { AutomationPanel } from './automation-panel';
import { BotDrawers } from './bot-drawers';
import { BotTabs } from './bot-tabs';
import { EmergencyBar } from './emergency-bar';
import styles from './bots.module.css';
import range from './date-range.module.css';

const STAT_KEYS = ['personas', 'scripts', 'posted', 'pending'] as const;

/** D-36 → D-41 Bot tương tác (orchestrator) — sau feature flag D-05 */
export function BotsScreen() {
  const t = useTranslations('bots');
  const route = useBotRoute();
  const data = useBotData();
  const actions = useBotActions();
  const emergencyPending = useIsMutating({ mutationKey: botEmergencyKey }) > 0;

  const header = <BotsHeader />;
  if (data.error) {
    return (
      <>
        {header}
        <ErrorState title={t('disabled')} onRetry={data.refetch} />
      </>
    );
  }
  if (data.loading || !data.settings) {
    return (
      <>
        {header}
        <PageSkeleton />
      </>
    );
  }

  const stats = botStats(data.personas, data.scripts, data.threads);
  return (
    <>
      {header}
      <div className={styles.wrap}>
        <div className={styles.stats}>
          {STAT_KEYS.map((k) => (
            <div key={k} className={styles.stat}>
              <span className={styles.statLabel}>{t(`stats.${k}`)}</span>
              <b className={styles.statValue}>{stats[k]}</b>
            </div>
          ))}
        </div>
        <div className={styles.card}>
          <div className={styles.head}>
            <span className={styles.title}>{t('card.title')}</span>
            <span className={styles.sub}>{t('card.sub')}</span>
          </div>
          <AutomationPanel
            disabled={emergencyPending || actions.settingsBusy}
            settings={data.settings}
            todayCount={data.activity?.todayCount ?? 0}
            onPatch={actions.patchSettings}
          />
          <BotTabs
            tab={route.tab}
            data={data}
            actions={actions}
            onTab={route.setTab}
            onOpen={route.openDrawer}
            extra={<EmergencyBar groups={data.groups} blocked={actions.settingsBusy} />}
          />
        </div>
      </div>
      <BotDrawers
        tab={route.tab}
        drawer={route.drawer}
        personas={data.personas}
        scripts={data.scripts}
        groups={data.groups}
        onClose={route.closeDrawer}
      />
    </>
  );
}

function BotsHeader() {
  const t = useTranslations('bots');
  return (
    <PageHeader
      title={t('title')}
      subtitle={t('sub')}
      extra={
        <div className={range.box}>
          <Icon name="calendar" stroke="rgba(0,0,0,0.65)" />
          {t('dateRange')}
          <Icon name="chevronDown" size={14} stroke="rgba(0,0,0,0.45)" />
        </div>
      }
    />
  );
}
