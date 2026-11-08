'use client';
import { APP_PUSH_KINDS, type PushPublicConfig } from '@opchub/shared/api-domains';
import { Alert, Flex, Switch, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { usePushPreferences } from '../hooks/use-push-preferences';
import { PushEnableButton } from './push-enable-button';

export function PushPreferences({ config }: { config: PushPublicConfig }) {
  const t = useTranslations('profile.push');
  const { query, save } = usePushPreferences();
  return (
    <Flex vertical gap="large">
      <PushEnableButton publicKey={config.vapidPublicKey} />
      <Typography.Title level={4}>{t('kinds')}</Typography.Title>
      {query.isError ? (
        <Alert
          type="error"
          message={t('failed')}
          action={
            <button type="button" onClick={() => void query.refetch()}>
              {t('retry')}
            </button>
          }
        />
      ) : null}
      {APP_PUSH_KINDS.map((kind) => (
        <Flex key={kind} justify="space-between" align="center" gap="middle">
          <div>
            <Typography.Text strong>{t(kind)}</Typography.Text>
            {!config.kinds[kind] ? <p>{t('adminOff')}</p> : null}
          </div>
          <Switch
            aria-label={t(kind)}
            checked={Boolean(config.kinds[kind] && query.data?.[kind])}
            disabled={!config.kinds[kind] || !query.data || save.isPending}
            onChange={(checked) => {
              if (query.data) save.mutate({ ...query.data, [kind]: checked });
            }}
          />
        </Flex>
      ))}
      {save.isError ? <Alert type="error" message={t('failed')} /> : null}
    </Flex>
  );
}
