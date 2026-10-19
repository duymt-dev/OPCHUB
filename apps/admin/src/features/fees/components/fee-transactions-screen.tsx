'use client';

import type { UnmatchedTxn } from '@opchub/shared/api-domains';
import { ErrorState, PageHeader } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { useCan } from '@/lib/permissions';
import { useFeeTransactions } from '../hooks/use-fee-transactions';
import styles from './fee-transactions.module.css';
import fees from './fees.module.css';
import { MatchDialog } from './match-dialog';
import { TxnTable } from './txn-table';

/** BUG-014 / NA-03 4b: "Giao dịch cần đối soát" — kế toán khớp tay giao dịch CK không tự khớp */
export function FeeTransactionsScreen() {
  const t = useTranslations('fees.txn');
  // FE ẩn nút theo permission key (luật 4); server vẫn kiểm `fees.action` → 403
  const canMatch = useCan('fees.action');
  const { q, rows } = useFeeTransactions();
  const [open, setOpen] = useState<UnmatchedTxn | null>(null);

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <div className={fees.wrap}>
        <div className={fees.card}>
          <div className={styles.top}>
            <h2 className={fees.heading}>{t('heading')}</h2>
            <Link href="/fees" className={styles.back}>
              {t('back')}
            </Link>
          </div>
          {q.isError ? (
            <ErrorState
              title={t('error')}
              retryLabel={t('retry')}
              onRetry={() => void q.refetch()}
            />
          ) : (
            <TxnTable rows={rows} canMatch={canMatch} onMatch={setOpen} />
          )}
          {q.isSuccess && rows.length === 0 ? (
            <div className={styles.empty}>{t('empty')}</div>
          ) : null}
          {q.hasNextPage ? (
            <button
              type="button"
              className={styles.more}
              disabled={q.isFetchingNextPage}
              onClick={() => void q.fetchNextPage()}
            >
              {t('more')}
            </button>
          ) : null}
        </div>
      </div>
      {open ? <MatchDialog key={open.id} txn={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}
