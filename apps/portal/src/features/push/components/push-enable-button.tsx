'use client';
import { Button, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { usePushSubscription } from '../hooks/use-push-subscription';

export function PushEnableButton({ publicKey }: { publicKey: string }) {
  const t = useTranslations('profile.push');
  const p = usePushSubscription(publicKey);
  const blocked = ['unsupported', 'ios', 'denied', 'loading'].includes(p.state);
  return (
    <section aria-label={t('device')}>
      <Typography.Title level={4}>{t('device')}</Typography.Title>
      <p role="status">{t(p.state)}</p>
      <Button loading={p.busy} disabled={blocked} onClick={() => void p.toggle()}>
        {t(p.state === 'on' ? 'disable' : 'enable')}
      </Button>
      {p.error ? <p role="alert">{p.error}</p> : null}
    </section>
  );
}
