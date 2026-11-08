'use client';
import { useTranslations } from 'next-intl';
import { APP_PUSH_KINDS } from '@opchub/shared/api-domains';
import { useAppNotify } from '../hooks/use-app-notify';
import { Switch } from './switch';
import { AppNotifyPwa } from './app-notify-pwa';
import { AppNotifyDevice } from './app-notify-device';
import styles from './app-notify.module.css';
export function AppNotifyTab() {
  const t = useTranslations('settings.app');
  const p = useAppNotify();
  if (p.query.error)
    return (
      <div role="alert">
        {t('failed')}{' '}
        <button
          type="button"
          onClick={() => {
            void p.query.refetch();
          }}
        >
          {t('retry')}
        </button>
      </div>
    );
  const form = p.form;
  if (!form) return <div role="status">{t('loading')}</div>;
  return (
    <section className={styles.card} aria-label={t('heading')}>
      <div className={styles.head}>
        <div>
          <h2>{t('heading')}</h2>
          <p>{t('sub')}</p>
        </div>
        <div className={styles.actions}>
          <button type="button" disabled={p.busy} onClick={() => p.send.mutate()}>
            {t('test')}
          </button>
          <button
            type="button"
            className={styles.primary}
            disabled={p.busy}
            onClick={() => p.save.mutate(form)}
          >
            {t('save')}
          </button>
        </div>
      </div>
      <AppNotifyPwa p={p} />
      <AppNotifyDevice />
      <div className={styles.kinds}>
        <h3>{t('kinds')}</h3>
        {APP_PUSH_KINDS.map((key) => (
          <div className={styles.row} key={key}>
            <div>
              <b>{t(key)}</b>
              <small>{t(`${key}Sub`)}</small>
            </div>
            <Switch
              on={form.push[key]}
              label={t(key)}
              disabled={p.busy}
              onChange={(v) => p.setDraft({ ...form, push: { ...form.push, [key]: v } })}
              size="lg"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
