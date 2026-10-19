'use client';

import type { UnmatchedTxn } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { vnd, vnDateTime } from '../model';
import styles from './fee-transactions.module.css';

interface Props {
  rows: UnmatchedTxn[];
  /** Thiếu `m.edit` → không có cột thao tác (server vẫn 403) */
  canMatch: boolean;
  onMatch: (t: UnmatchedTxn) => void;
}

/** Bảng giao dịch CK không khớp (NA-03 4b): giờ VN, tiền VND nguyên, lý do, gợi ý Mã TV */
export function TxnTable({ rows, canMatch, onMatch }: Props) {
  const t = useTranslations('fees.txn');
  return (
    <div className={styles.scroll}>
      <table className={styles.table} data-m="txn-tbl">
        <thead>
          <tr>
            <th scope="col">{t('col.receivedAt')}</th>
            <th scope="col" className={styles.num}>
              {t('col.amount')}
            </th>
            <th scope="col">{t('col.content')}</th>
            <th scope="col">{t('col.reason')}</th>
            <th scope="col">{t('col.hint')}</th>
            {canMatch ? <th scope="col">{t('col.action')}</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className={styles.muted}>{vnDateTime(r.receivedAt)}</td>
              <td className={styles.num}>{vnd(r.amount)}</td>
              <td className={styles.content}>{r.content}</td>
              <td>{r.reason ?? '—'}</td>
              <td>{r.matchedHint ? <span className={styles.hint}>{r.matchedHint}</span> : '—'}</td>
              {canMatch ? (
                <td>
                  <button type="button" className={styles.act} onClick={() => onMatch(r)}>
                    {t('match')}
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
