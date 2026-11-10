'use client';

import { Button, Card, Tag } from 'antd';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import styles from './profile.module.css';

export function SecurityCard() {
  const t = useTranslations('common.adminProfile');
  const me = useAuthStore((s) => s.me);
  const router = useRouter();
  if (!me) return null;
  return (
    <Card title={t('security')}>
      <div className={styles.security}>
        <span>{t('role')}</span>
        <Tag>{me.roleName ?? t('noRole')}</Tag>
      </div>
      <div className={styles.security}>
        <span>{t('twoFactor')}</span>
        <Tag color={me.twoFactor ? 'green' : 'default'}>
          {t(me.twoFactor ? 'enabled' : 'disabled')}
        </Tag>
        {!me.twoFactor ? (
          <Button onClick={() => router.push('/two-factor')}>{t('enable')}</Button>
        ) : null}
      </div>
    </Card>
  );
}
