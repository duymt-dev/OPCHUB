'use client';

import type { BotReplyOverview, BotReplySettings } from '@opchub/shared/api-domains';
import { useFormatter, useTranslations } from 'next-intl';
import { Switch } from './bits';
import styles from './reply-panel.module.css';
import { useNumberText } from '@/i18n/use-number-text';

interface Props {
  data: BotReplyOverview;
  groupCount: number;
  disabled: boolean;
  onPatch: (patch: Partial<BotReplySettings>) => void;
}

export function ReplyHeading({ data, groupCount, disabled, onPatch }: Props) {
  const numberText = useNumberText();
  const t = useTranslations('bots.replies');
  const format = useFormatter();
  const lastScan = data.lastScanAt
    ? t('lastScan', {
        time: format.dateTime(new Date(data.lastScanAt), {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Asia/Ho_Chi_Minh',
        }),
      })
    : t('never');
  return (
    <div className={styles.heading}>
      <div className={styles.intro}>
        <h3>{t('title')}</h3>
        <p>{t('description')}</p>
        <div className={styles.tracking}>
          <span className={data.run?.status === 'running' ? styles.running : styles.watching}>
            {data.run?.status === 'running'
              ? t('replyingIn', { group: data.run.groupName })
              : t(data.settings.autoEnabled ? 'tracking' : 'autoOff', {
                  n: numberText(groupCount),
                })}
          </span>
          <span>{lastScan}</span>
        </div>
      </div>
      <div className={styles.toggle}>
        <span>{t('automatic')}</span>
        <Switch
          label={t('automatic')}
          on={data.settings.autoEnabled}
          disabled={disabled}
          onChange={() => onPatch({ autoEnabled: !data.settings.autoEnabled })}
        />
      </div>
    </div>
  );
}
