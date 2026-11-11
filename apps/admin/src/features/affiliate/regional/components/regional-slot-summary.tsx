'use client';
import { Button } from 'antd';
import { useTranslations } from 'next-intl';
import type { RegionalSlot } from '@opchub/shared/api-domains';
import styles from './regional.module.css';
import { useNumberText } from '@/i18n/use-number-text';

export function RegionalSlotSummary({
  slot,
  canManage,
  pending,
  onRevoke,
}: {
  slot: RegionalSlot;
  canManage: boolean;
  pending: boolean;
  onRevoke: () => void;
}) {
  const numberText = useNumberText();
  const t = useTranslations('affiliate.regional');
  return (
    <>
      <header className={styles.slotHead}>
        <span className={styles.avatar}>{slot.member?.fullName.split(' ').at(-1)?.[0] ?? '—'}</span>
        <div className={styles.identity}>
          <div>
            <b>{slot.member?.fullName ?? t('vacant')}</b>
            <span className={styles.region}>{slot.label}</span>
          </div>
          <small>{slot.member?.email ?? '—'}</small>
        </div>
        {canManage && slot.member && (
          <Button danger size="small" disabled={pending} onClick={onRevoke}>
            {t('revoke')}
          </Button>
        )}
      </header>
      <div className={styles.counts}>
        <div>
          <span>{t('provinces')}</span>
          <b>{t('provinceCount', { n: numberText(slot.provinces.length) })}</b>
        </div>
        <div>
          <span>{t('network')}</span>
          <b>{t('affiliateCount', { n: numberText(slot.affiliateCount) })}</b>
        </div>
      </div>
    </>
  );
}
