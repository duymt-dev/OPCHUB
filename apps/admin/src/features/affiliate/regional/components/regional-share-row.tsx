'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCan } from '@/lib/permissions';
import type { RegionalShareRow as Row } from '../types';
import { affiliateMoney } from '../../format';
import { RegionalShareItems } from './regional-share-items';
import { RegionalPayoutHistory } from './regional-payout-history';
import { RegionalPayoutDialog } from './regional-payout-dialog';
import styles from './regional-share.module.css';
export function RegionalShareRow({ row }: { row: Row }) {
  const t = useTranslations('affiliate.regional.share');
  const [open, setOpen] = useState(false);
  const canPay = useCan('affiliate.payout');
  return (
    <>
      <div role="row" className={styles.row} data-region={row.region}>
        <div role="cell">
          <button className={styles.identity} aria-expanded={open} onClick={() => setOpen(!open)}>
            <span>{open ? '▾' : '▸'}</span>
            <div>
              <b>{row.member?.fullName ?? t('vacant')}</b>
              <small>
                {row.label} · {t('provinces', { n: row.provinces })} · {row.member?.email}
              </small>
            </div>
          </button>
        </div>
        <div role="cell">
          <b>{row.bank?.bankHolder ?? t('noBank')}</b>
          <small>{row.bank ? `${row.bank.bankName} · ${row.bank.bankNo}` : ''}</small>
        </div>
        <div role="cell">{row.affiliates}</div>
        <div role="cell">{row.count}</div>
        <div role="cell">{affiliateMoney(row.total)}</div>
        <div role="cell" className={styles.paid}>
          {affiliateMoney(row.paid)}
        </div>
        <div role="cell" className={styles.due}>
          {affiliateMoney(row.due)}
        </div>
        <div role="cell">
          {canPay && row.payees.some((p) => p.due > 0) ? (
            row.payees
              .filter((p) => p.due > 0)
              .map((p) => <RegionalPayoutDialog key={p.userId} region={row.region} payee={p} />)
          ) : (
            <small>{t('noPending')}</small>
          )}
        </div>
      </div>
      {open && (
        <div className={styles.details}>
          <RegionalShareItems region={row.region} />
          <RegionalPayoutHistory region={row.region} />
        </div>
      )}
    </>
  );
}
