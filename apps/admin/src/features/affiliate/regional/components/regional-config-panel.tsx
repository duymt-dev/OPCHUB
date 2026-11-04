'use client';
import { Button } from 'antd';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ErrorState, PageSkeleton, useToast } from '@opchub/ui';
import type { RegionalRegion } from '@opchub/shared/api-domains';
import { useCan, useGrants } from '@/lib/permissions';
import { useRegionalDirectors } from '../hooks/use-regional-directors';
import { RegionalSlotCard } from './regional-slot-card';
import { RegionalHistory } from './regional-history';
import { RegionalList } from './regional-list';
import styles from './regional.module.css';

export function RegionalConfigPanel({ list = false }: { list?: boolean }) {
  const t = useTranslations('affiliate.regional');
  const q = useRegionalDirectors();
  const allowed = useCan('affiliate.regional');
  const grants = useGrants();
  const toast = useToast();
  const [open, setOpen] = useState<RegionalRegion | null>(null);
  if (q.isError)
    return (
      <ErrorState title={t('error')} retryLabel={t('retry')} onRetry={() => void q.refetch()} />
    );
  if (!q.data) return <PageSkeleton />;
  if (list) return <RegionalList />;
  const canManage = allowed && q.data.canManage;
  const add = () => {
    const empty = q.data.items.find((s) => !s.member);
    if (!empty) return toast(t('full'));
    document.getElementById(`regional-${empty.region}`)?.scrollIntoView({ block: 'center' });
    setOpen(empty.region);
  };
  return (
    <div className={styles.panel}>
      <div className={styles.heading}>
        <div>
          <b>{t('title')}</b>
          <span>{t('description')}</span>
        </div>
        {canManage && (
          <Button type="primary" onClick={add}>
            {t('add')}
          </Button>
        )}
      </div>
      <div className={styles.rules}>
        {(['appoint', 'revoke', 'scope'] as const).map((key) => (
          <div key={key}>
            <small>{t(`${key}Label`)}</small>
            <span>{t(`${key}Hint`)}</span>
          </div>
        ))}
      </div>
      {!canManage && (
        <div className={styles.notice}>{t('readonly', { role: grants.roleName })}</div>
      )}
      <div className={styles.notice}>
        {q.data.unassignedProvinces
          ? t('unassigned', { n: q.data.unassignedProvinces })
          : t('allAssigned')}
      </div>
      <div className={styles.slots}>
        {q.data.items.map((slot) => (
          <RegionalSlotCard
            key={slot.region}
            slot={slot}
            canManage={canManage}
            forceOpen={open === slot.region}
            onClose={() => setOpen(null)}
          />
        ))}
      </div>
      <RegionalHistory items={q.data.history} />
    </div>
  );
}
