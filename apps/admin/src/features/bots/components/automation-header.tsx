'use client';

import { Icon } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { BotScheduleControl } from '../types';
import { Switch } from './bits';
import styles from './auto-panel.module.css';

export function AutomationHeader({
  control,
  enabled,
  todayCount,
  disabled,
}: {
  control: BotScheduleControl;
  enabled: boolean;
  todayCount: number;
  disabled: boolean;
}) {
  const t = useTranslations('bots.auto');
  const scheduleText = useTranslations('bots.schedule');
  const state = enabled ? control.state : 'paused';
  return (
    <div className={styles.row}>
      <span className={styles.icon} data-state={state} aria-hidden="true">
        <Icon name="bots" size={20} stroke="currentColor" />
      </span>
      <div className={styles.text}>
        <span className={styles.title}>
          <span>{t('heading')}</span>
          <span className={styles.badge} data-state={state}>
            {scheduleText(`state.${state}`)}
          </span>
        </span>
        <span className={styles.status}>
          <i className={`${styles.dot} ${state === 'live' ? styles.dotOn : ''}`} />
          {state === 'live' ? t('waiting') : scheduleText(`detail.${state}`)}
        </span>
      </div>
      <div className={styles.count}>
        <b className={styles.countValue}>{todayCount}</b>
        <span className={styles.countLabel}>{t('today')}</span>
      </div>
      <Switch
        disabled={disabled}
        on={enabled && !control.schedule.paused}
        label={t('title')}
        onChange={control.onToggle}
      />
    </div>
  );
}
