'use client';

import type { FeeRow } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { FEE_TONE, rowActions, vnDate } from '../model';
import styles from './fee-table.module.css';

type RowAction = 'collect' | 'renew' | 'remind';

interface Props {
  rows: FeeRow[];
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onAction: (r: FeeRow, action: RowAction) => void;
}

function Box({ mark }: { mark: '' | '✓' | '–' }) {
  return (
    <span className={`${styles.box} ${mark ? styles.boxOn : ''}`} aria-hidden>
      {mark}
    </span>
  );
}

function Row({
  r,
  on,
  onToggle,
  onAction,
}: {
  r: FeeRow;
  on: boolean;
  onToggle: () => void;
  onAction: (a: RowAction) => void;
}) {
  const t = useTranslations('fees');
  const can = rowActions(r.status);
  return (
    <div className={`${styles.grid} ${styles.row} ${on ? styles.rowOn : ''}`} role="row">
      <div className={styles.tickCell} role="cell">
        <button
          type="button"
          role="checkbox"
          aria-checked={on}
          aria-label={t('selectRow', { name: r.fullName })}
          className={styles.tick}
          onClick={onToggle}
        >
          <Box mark={on ? '✓' : ''} />
        </button>
      </div>
      <div className={styles.member} role="cell">
        <b className={styles.name}>{r.fullName}</b>
        <span className={styles.email}>{r.email}</span>
      </div>
      <span className={styles.td} role="cell">
        {t(`type.${r.accountType}`)}
      </span>
      <span className={`${styles.td} ${styles.muted}`} role="cell">
        {vnDate(r.joinedAt)}
      </span>
      <div className={styles.td} role="cell">
        <span className={`${styles.tag} ${styles[FEE_TONE[r.status]]}`}>
          {t(`status.${r.status}`)}
        </span>
      </div>
      <span className={styles.td} role="cell">
        {vnDate(r.paidAt)}
      </span>
      <span className={`${styles.td} ${styles.strong}`} role="cell">
        {vnDate(r.validUntil)}
      </span>
      <div className={styles.actions} role="cell">
        {can.collect ? (
          <button
            type="button"
            className={`${styles.act} ${styles.primary}`}
            onClick={() => onAction('collect')}
          >
            {t('row.collect')}
          </button>
        ) : null}
        {can.renew ? (
          <button type="button" className={styles.act} onClick={() => onAction('renew')}>
            {t('row.renew')}
          </button>
        ) : null}
        {can.remind ? (
          <button
            type="button"
            className={`${styles.act} ${styles.link}`}
            onClick={() => onAction('remind')}
          >
            {t('row.remind')}
          </button>
        ) : null}
      </div>
    </div>
  );
}

const COLS = ['member', 'type', 'joined', 'status', 'paid', 'until'] as const;

/** Bảng lưới tự vẽ như prototype (`data-m="tbl"`), cuộn ngang ở màn hẹp */
export function FeeTable({ rows, selected, onToggle, onToggleAll, onAction }: Props) {
  const t = useTranslations('fees');
  const n = rows.filter((r) => selected.has(r.userId)).length;
  const all = rows.length > 0 && n === rows.length;
  const mark = all ? '✓' : n > 0 ? '–' : '';
  return (
    <div data-m="tbl" className={styles.tbl}>
      <div className={styles.inner} role="table">
        <div className={`${styles.grid} ${styles.headRow}`} role="row">
          <div className={styles.tickCell} role="columnheader">
            <button
              type="button"
              role="checkbox"
              aria-checked={all ? true : n > 0 ? 'mixed' : false}
              aria-label={t('selectAll')}
              className={styles.tick}
              onClick={onToggleAll}
            >
              <Box mark={mark} />
            </button>
          </div>
          {COLS.map((c) => (
            <span key={c} className={styles.th} role="columnheader">
              {t(`col.${c}`)}
            </span>
          ))}
          <span className={styles.th} role="columnheader" />
        </div>
        {rows.map((r) => (
          <Row
            key={r.userId}
            r={r}
            on={selected.has(r.userId)}
            onToggle={() => onToggle(r.userId)}
            onAction={(a) => onAction(r, a)}
          />
        ))}
      </div>
    </div>
  );
}
