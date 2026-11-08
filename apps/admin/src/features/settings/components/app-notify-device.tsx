'use client';
import { Button } from 'antd';
import { useTranslations } from 'next-intl';
import { useAppNotifyDevice } from '../hooks/use-app-notify-device';

export function AppNotifyDevice() {
  const t = useTranslations('settings.app.device');
  const p = useAppNotifyDevice();
  if (!p.config.data?.enabled) return null;
  return (
    <section aria-label={t('heading')}>
      <h3>{t('heading')}</h3>
      <p role="status">{t(p.state)}</p>
      <Button
        loading={p.busy}
        disabled={['unsupported', 'ios', 'denied', 'loading'].includes(p.state)}
        onClick={() => void p.toggle()}
      >
        {t(p.state === 'on' ? 'disable' : 'enable')}
      </Button>
      {p.error ? <p role="alert">{p.error}</p> : null}
    </section>
  );
}
