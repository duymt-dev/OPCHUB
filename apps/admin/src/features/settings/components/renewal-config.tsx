'use client';
import type { RenewalSettings } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { Switch } from './switch';
import styles from './renewal.module.css';
type Props = {
  form: RenewalSettings;
  busy: boolean;
  set: <K extends keyof RenewalSettings>(
    group: K,
    key: keyof RenewalSettings[K],
    v: boolean,
  ) => void;
};
export function RenewalConfig({ form, busy, set }: Props) {
  const t = useTranslations('settings.renewal');
  return (
    <div className={styles.grid}>
      <section className={styles.panel} aria-label={t('milestones')}>
        <div className={styles.panelTitle}>{t('milestones')}</div>
        {(['d30', 'd7', 'd1'] as const).map((k) => (
          <div className={styles.option} key={k}>
            <div className={styles.optionText}>
              <span>{t(k)}</span>
              <small>{t(`${k}Sub`)}</small>
            </div>
            <Switch
              on={form.milestones[k]}
              label={t(k)}
              disabled={busy}
              onChange={(v) => set('milestones', k, v)}
              size="lg"
            />
          </div>
        ))}
      </section>
      <section className={styles.panel} aria-label={t('channels')}>
        <div className={styles.panelTitle}>{t('channels')}</div>
        {(['email', 'app'] as const).map((k) => (
          <div className={styles.option} key={k}>
            <span className={styles.optionText}>{t(k)}</span>
            <Switch
              on={form.channels[k]}
              label={t(k)}
              disabled={busy}
              onChange={(v) => set('channels', k, v)}
              size="lg"
            />
          </div>
        ))}
      </section>
    </div>
  );
}
