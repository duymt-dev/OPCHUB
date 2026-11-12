'use client';

import { LOCK_DAYS, type LockDays, lockDaysSchema } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useModerationSettings } from '../hooks/use-moderation';
import styles from './moderation.module.css';
import { Switch } from 'antd';
import { useNumberText } from '@/i18n/use-number-text';

/** "Quy tắc xử lý vi phạm" + chọn "Thời gian khóa" (prototype v4 2850, D-77/D-83) */
export function ModerationRules() {
  const numberText = useNumberText();
  const t = useTranslations('groups.mod');
  const tt = useTranslations('groups.toast');
  const toast = useToast();
  const { days, save, ai, aiSave } = useModerationSettings();
  const onChange = (raw: string) => {
    const next = lockDaysSchema.safeParse(Number(raw));
    if (!next.success) return;
    const value: LockDays = next.data;
    save.mutate(value, { onSuccess: () => toast(tt('lockTime', { days: numberText(value) })) });
  };
  return (
    <div className={styles.rules}>
      <span className={styles.kwTitle}>{t('rules')}</span>
      <label className={styles.lockTime} htmlFor="ai-moderation-enabled">
        {t('aiEnabled')}
        <Switch
          id="ai-moderation-enabled"
          aria-label={t('aiEnabled')}
          checked={ai}
          loading={aiSave.isPending}
          onChange={(value) => aiSave.mutate({ autoLockDays: days, ai: value })}
        />
      </label>
      <div className={styles.ruleGrid}>
        <b>{t('rule1Label')}</b>
        <span>{t('rule1')}</span>
        <b>{t('rule2Label')}</b>
        <span>{t('rule2')}</span>
      </div>
      <label className={styles.lockTime}>
        {t('lockTime')}
        <select
          className={styles.lockSelect}
          value={String(days)}
          onChange={(e) => onChange(e.target.value)}
        >
          {LOCK_DAYS.map((n) => (
            <option key={n} value={String(n)}>
              {t('dayOpt', { days: numberText(n) })}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
