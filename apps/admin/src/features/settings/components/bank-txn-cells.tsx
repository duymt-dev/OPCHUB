'use client';
import { StatusTag } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { BankTxnRow } from '@opchub/shared/api-domains';
import styles from './bank.module.css';

export function BankTxnStatus({ row: r }: { row: BankTxnRow }) {
  const t = useTranslations('settings.bank');
  const tone =
    r.status === 'matched'
      ? 'green'
      : r.status === 'manual'
        ? 'blue'
        : r.status === 'short'
          ? 'amber'
          : 'rose';
  return (
    <div title={r.reason ?? undefined}>
      <StatusTag tone={tone}>{t(`statuses.${r.shortRecorded ? 'recorded' : r.status}`)}</StatusTag>
      {r.reason && r.status === 'unmatched' ? (
        <small className={styles.muted}>{r.reason}</small>
      ) : null}
    </div>
  );
}
export function BankTxnAction({
  row: r,
  busy,
  canAct,
  assign,
  short,
}: {
  row: BankTxnRow;
  busy: boolean;
  canAct: boolean;
  assign: (r: BankTxnRow) => void;
  short: (r: BankTxnRow) => void;
}) {
  const t = useTranslations('settings.bank');
  if (r.shortRecorded || !canAct || r.status === 'matched' || r.status === 'manual') return null;
  return (
    <button
      type="button"
      className={styles.send}
      disabled={busy}
      onClick={() => (r.status === 'short' ? short(r) : assign(r))}
    >
      {r.status === 'short'
        ? t('short')
        : t('assign', { name: r.suggestedName ?? t('memberFallback') })}
    </button>
  );
}
