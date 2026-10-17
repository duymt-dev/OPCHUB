'use client';

import type { AdminCategory } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { Switch } from './switch';
import styles from './categories.module.css';

const COLS = ['order', 'name', 'scope', 'projects', 'biz', 'visible'] as const;

interface RowActions {
  onMove: (i: number, d: -1 | 1) => void;
  onToggle: (c: AdminCategory) => void;
  onEdit: (c: AdminCategory) => void;
  onDelete: (c: AdminCategory) => void;
  inUse: (c: AdminCategory) => boolean;
}

function CategoryRow({
  c,
  i,
  editing,
  act,
}: {
  c: AdminCategory;
  i: number;
  editing: boolean;
  act: RowActions;
}) {
  const t = useTranslations('settings.cat');
  const cls = [styles.row, c.enabled ? '' : styles.off, editing ? styles.editing : ''];
  return (
    <div role="row" className={cls.join(' ')}>
      <div className={styles.order} role="cell">
        <span className={styles.idx}>{i + 1}</span>
        {([-1, 1] as const).map((d) => {
          const label = d < 0 ? t('up') : t('down');
          return (
            <button
              key={d}
              type="button"
              title={label}
              aria-label={label}
              className={styles.arrow}
              onClick={() => act.onMove(i, d)}
            >
              {d < 0 ? '▲' : '▼'}
            </button>
          );
        })}
      </div>
      <div className={styles.nameCell} role="cell">
        <i className={styles.dot} style={{ ['--c' as string]: c.color }} />
        <span className={styles.nameText}>{c.name}</span>
      </div>
      <div className={styles.tags} role="cell">
        {c.scope.map((s) => (
          <span key={s} className={styles.tag}>
            {t(s)}
          </span>
        ))}
      </div>
      <span role="cell">{c.projectCount}</span>
      <span role="cell">{c.bizCount}</span>
      <div role="cell">
        <Switch
          on={c.enabled}
          size="md"
          label={t('visibleOf', { name: c.name })}
          onChange={() => act.onToggle(c)}
        />
      </div>
      <div className={styles.actions} role="cell">
        <button type="button" className={styles.small} onClick={() => act.onEdit(c)}>
          {t('edit')}
        </button>
        <button
          type="button"
          className={`${styles.small} ${act.inUse(c) ? styles.delMuted : styles.del}`}
          onClick={() => act.onDelete(c)}
        >
          {t('delete')}
        </button>
      </div>
    </div>
  );
}

/** Bảng lĩnh vực (D-67): ▲▼ thứ tự, màu, nơi áp dụng, số dùng, hiển thị, Sửa / Xoá */
export function CategoryTable({
  rows,
  editId,
  ...act
}: RowActions & { rows: { c: AdminCategory; i: number }[]; editId: string | null }) {
  const t = useTranslations('settings.cat');
  return (
    <div data-m="tbl" className={styles.tableWrap}>
      <div className={styles.table} role="table" aria-label={t('heading')}>
        <div className={`${styles.row} ${styles.headRow}`} role="row">
          {COLS.map((k) => (
            <span key={k} role="columnheader">
              {t(`cols.${k}`)}
            </span>
          ))}
          <span role="columnheader" />
        </div>
        {rows.map(({ c, i }) => (
          <CategoryRow key={c.id} c={c} i={i} editing={editId === c.id} act={act} />
        ))}
      </div>
    </div>
  );
}
