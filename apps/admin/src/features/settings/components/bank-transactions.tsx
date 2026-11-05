'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { BankTxnRow, UnmatchedTxn } from '@opchub/shared/api-domains';
import { MatchDialog } from '@/features/fees';
import { useGrants } from '@/lib/permissions';
import { can } from '@/lib/permission-model';
import type { BankPanel } from '../types';
import { BankTxnTable } from './bank-txn-table';
import { BankShortDialog } from './bank-short-dialog';
import styles from './bank.module.css';

export function BankTransactions({ panel: p }: { panel: BankPanel }) {
  const t = useTranslations('settings.bank'),
    canAct = can(useGrants(), 'fees.action');
  const [assign, setAssign] = useState<UnmatchedTxn | null>(null),
    [short, setShort] = useState<BankTxnRow | null>(null);
  return (
    <>
      <div className={styles.head}>
        <b>{t('recent')}</b>
        {canAct ? (
          <button
            type="button"
            className={styles.button}
            disabled={p.busy}
            onClick={() => p.csv.mutate()}
          >
            {t('export')}
          </button>
        ) : null}
      </div>
      {p.list.isPending ? (
        <div role="status">{t('loading')}</div>
      ) : (
        <BankTxnTable
          rows={p.rows}
          busy={p.busy}
          canAct={canAct}
          assign={(r) =>
            setAssign({
              id: r.id,
              amount: r.amount,
              content: r.content,
              receivedAt: r.receivedAt,
              reason: r.reason,
              matchedHint: r.matchedHint,
              fundraisingHint: r.fundraisingHint,
            })
          }
          short={setShort}
        />
      )}
      {p.list.hasNextPage ? (
        <button
          type="button"
          className={styles.button}
          disabled={p.list.isFetchingNextPage}
          onClick={() => void p.list.fetchNextPage()}
        >
          {t('more')}
        </button>
      ) : null}
      {assign ? (
        <MatchDialog
          txn={assign}
          onClose={() => {
            setAssign(null);
            p.refresh();
          }}
        />
      ) : null}
      {short ? (
        <BankShortDialog
          busy={p.busy}
          close={() => setShort(null)}
          save={(note) =>
            p.short.mutate({ id: short.id, note }, { onSuccess: () => setShort(null) })
          }
        />
      ) : null}
    </>
  );
}
