'use client';

import type { UnmatchedTxn } from '@opchub/shared/api-domains';
import { useLocale, useTranslations } from 'next-intl';
import { vnd, vnDateTime } from '../model';
import styles from './fee-transactions.module.css';

interface Props {
  rows: UnmatchedTxn[];
  /** Thiếu `m.edit` → không có cột thao tác (server vẫn 403) */
  canMatch: boolean;
  onMatch: (t: UnmatchedTxn) => void;
}

/** Bảng giao dịch CK không khớp (NA-03 4b): giờ VN, tiền VND nguyên, lý do, gợi ý Mã TV / mã GV (D-113) */
export function TxnTable({ rows, canMatch, onMatch }: Props) {
  const locale = useLocale();
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
              <td className={styles.muted}>{vnDateTime(r.receivedAt, locale)}</td>
              <td className={styles.num}>{vnd(r.amount, locale)}</td>
              <td className={styles.content}>{r.content}</td>
              <td>{r.reason ?? '—'}</td>
              <td>
                {r.matchedHint || r.fundraisingHint
                  ? [r.matchedHint, r.fundraisingHint]
                      .filter((h): h is string => !!h)
                      .map((h) => (
                        <span key={h} className={styles.hint}>
                          {h}
                        </span>
                      ))
                  : '—'}
              </td>
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
