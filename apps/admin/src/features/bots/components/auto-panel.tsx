'use client';

import type { BotSettings } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useCan } from '@/lib/permissions';
import { parseTopics } from '../model';
import styles from './auto-panel.module.css';
import { Switch } from './bits';

interface Props {
  settings: BotSettings;
  todayCount: number;
  onPatch: (p: Partial<BotSettings>) => void;
  disabled?: boolean;
}

/** "Chế độ tự động 100%" (D-50 / NA-08; nhãn công tắc giữ "Chế độ tự động"): 2 tuỳ chọn, chủ đề AI (D-36) */
export function AutoPanel({ settings, todayCount, onPatch, disabled = false }: Props) {
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
      <div className={styles.row}>
        <span className={styles.icon} aria-hidden="true">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
          </svg>
        </span>
        <div className={styles.text}>
          <span className={styles.title}>{t('heading')}</span>
          <span className={styles.status}>
            <i className={`${styles.dot} ${settings.enabled ? styles.dotOn : ''}`} />
            {settings.enabled ? t('waiting') : t('paused')}
          </span>
        </div>
        <div className={styles.count}>
          <b className={styles.countValue}>{todayCount}</b>
          <span className={styles.countLabel}>{t('today')}</span>
        </div>
        <Switch
          disabled={locked}
          on={settings.enabled}
          label={t('title')}
          onChange={() => onPatch({ enabled: !settings.enabled })}
        />
      </div>
      <span className={styles.desc}>{t('desc')}</span>
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
