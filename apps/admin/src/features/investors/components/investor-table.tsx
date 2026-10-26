'use client';

import type { AdminInvestor } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { money, projectList, shortDate } from '../model';
import { InvestorAvatar, KindTag } from './tags';
import styles from './investor-table.module.css';

const COLS = ['investor', 'kind', 'org', 'phone', 'projects', 'total'] as const;

function Row({ x, onOpen }: { x: AdminInvestor; onOpen: () => void }) {
  const t = useTranslations('investors');
  return (
    <div className={`${styles.grid} ${styles.row}`} role="row">
      <div className={styles.who} role="cell">
        <InvestorAvatar src={x.avatarUrl} size={36} />
        <div className={styles.whoText}>
          <b className={styles.name}>{x.name}</b>
          <span className={styles.meta}>{shortDate(x.lastAt)}</span>
        </div>
      </div>
      <div className={styles.td} role="cell">
        <KindTag kind={x.kind} />
      </div>
      <span className={`${styles.td} ${styles.big}`} role="cell">
        {x.organization}
      </span>
      <span className={`${styles.td} ${styles.big} ${styles.num}`} role="cell">
        {x.phone}
      </span>
      <span className={`${styles.td} ${styles.muted}`} role="cell">
        {projectList(x.items.map((i) => i.projectName))}
      </span>
      <b className={`${styles.td} ${styles.money}`} role="cell">
        {money(x.totalAmount)}
      </b>
      <div className={styles.actions} role="cell">
        <button type="button" className={styles.link} onClick={onOpen}>
          {t('detail')}
        </button>
      </div>
    </div>
  );
}

/** Bảng lưới tự vẽ như prototype (`data-m="tbl"`), cuộn ngang ở màn hẹp */
export function InvestorTable({
  rows,
  onOpen,
}: {
  rows: AdminInvestor[];
  onOpen: (x: AdminInvestor) => void;
}) {
  const t = useTranslations('investors.col');
  return (
    <div data-m="tbl" className={styles.tbl}>
      <div className={styles.inner} role="table">
        <div className={`${styles.grid} ${styles.headRow}`} role="row">
          {COLS.map((c) => (
            <span key={c} className={styles.th} role="columnheader">
              {t(c)}
            </span>
          ))}
          <span className={styles.th} role="columnheader" />
        </div>
        {rows.map((x) => (
          <Row key={x.key} x={x} onOpen={() => onOpen(x)} />
        ))}
      </div>
    </div>
  );
}
