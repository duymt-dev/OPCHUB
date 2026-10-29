'use client';

import type { BotSettings } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useCan } from '@/lib/permissions';
import { parseTopics } from '../model';
import styles from './auto-panel.module.css';
import { Switch } from './bits';
import { AutomationHeader } from './automation-header';
import { ScheduleBar } from './schedule-bar';
import type { BotScheduleControl } from '../types';

interface Props {
  settings: BotSettings;
  control: BotScheduleControl;
  todayCount: number;
  onPatch: (p: Partial<BotSettings>) => void;
  disabled?: boolean;
}

/** "Chế độ tự động 100%" (D-50 / NA-08; nhãn công tắc giữ "Chế độ tự động"): 2 tuỳ chọn, chủ đề AI (D-36) */
export function AutoPanel({ settings, control, todayCount, onPatch, disabled = false }: Props) {
  const t = useTranslations('bots.auto');
  const allowed = useCan('bots.action');
  const locked = disabled || !allowed;
  const [topics, setTopics] = useState(settings.topics.join(', '));
  const saveTopics = () => {
    if (locked) return;
    const next = parseTopics(topics);
    if (next.join('|') !== settings.topics.join('|')) onPatch({ topics: next });
  };
  const opts = [
    { key: 'autoGenerate', title: t('genTitle'), desc: t('genDesc') },
    { key: 'replyToMembers', title: t('replyTitle'), desc: t('replyDesc') },
  ] as const;

  return (
    <div className={styles.box}>
      <AutomationHeader
        control={control}
        enabled={settings.enabled}
        todayCount={todayCount}
        disabled={locked}
      />
      <span className={styles.desc}>{t('desc')}</span>
      <ScheduleBar control={control} enabled={settings.enabled} disabled={locked} />
      <div className={styles.opts}>
        {opts.map((o) => (
          <div key={o.key} className={styles.opt}>
            <Switch
              disabled={locked}
              on={settings[o.key]}
              label={o.title}
              onChange={() => onPatch({ [o.key]: !settings[o.key] })}
            />
            <div className={styles.optText}>
              <span className={styles.optTitle}>{o.title}</span>
              <span className={styles.optDesc}>{o.desc}</span>
            </div>
          </div>
        ))}
      </div>
      <label className={styles.field}>
        {t('topics')}
        <input
          disabled={locked}
          className={styles.input}
          value={topics}
          onChange={(e) => setTopics(e.target.value)}
          onBlur={saveTopics}
          onKeyDown={(e) => e.key === 'Enter' && saveTopics()}
        />
      </label>
    </div>
  );
}
