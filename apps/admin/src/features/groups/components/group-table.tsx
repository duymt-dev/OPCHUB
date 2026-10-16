'use client';

import { useTranslations } from 'next-intl';
import type { KeyboardEvent } from 'react';
import { formatCount } from '../model';
import type { AdminGroup } from '../types';
import { Cover, type GroupRowActions } from './group-grid';
import styles from './group-table.module.css';

type Mark = 'on' | 'part' | 'off';

/** Ô tick 16px như prototype (div để giữ cấu trúc bảng responsive của prototype) */
function Tick({ mark, label, onToggle }: { mark: Mark; label: string; onToggle: () => void }) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onToggle();
    }
  };
  return (
    <div
      role="checkbox"
      tabIndex={0}
      aria-checked={mark === 'part' ? 'mixed' : mark === 'on'}
      aria-label={label}
      className={`${styles.tick} ${mark !== 'off' ? styles.tickOn : ''}`}
      onClick={onToggle}
      onKeyDown={onKey}
    >
      {mark === 'on' ? '✓' : mark === 'part' ? '–' : ''}
    </div>
  );
}

interface Props {
  items: AdminGroup[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  actions: GroupRowActions;
}

/** D-24 / D-26: bảng nhóm (dạng danh sách) có chọn nhiều */
export function GroupTable({ items, selected, onToggle, onToggleAll, actions }: Props) {
  const t = useTranslations('groups.list');
  const n = items.filter((g) => selected.has(g.id)).length;
  const all: Mark = n > 0 && n === items.length ? 'on' : n > 0 ? 'part' : 'off';
  return (
    <div className={styles.tbl} data-m="tbl">
      <div className={styles.inner}>
        <div className={`${styles.row} ${styles.head}`}>
          <Tick mark={all} label={t('selectAll')} onToggle={onToggleAll} />
          <span>{t('col.group')}</span>
          <span>{t('col.region')}</span>
          <span>{t('col.members')}</span>
          <span>{t('col.weekly')}</span>
          <span>{t('col.rooms')}</span>
          <span />
        </div>
        {items.map((g) => {
          const on = selected.has(g.id);
          return (
            <div key={g.id} className={`${styles.row} ${on ? styles.rowOn : ''}`}>
              <Tick
                mark={on ? 'on' : 'off'}
                label={t('selectRow', { name: g.name })}
                onToggle={() => onToggle(g.id)}
              />
              <div className={styles.nameCell}>
                <div className={styles.thumb}>
                  <Cover g={g} />
                </div>
                <div className={styles.names}>
                  <b>{g.name}</b>
                  <span className={styles.sub}>{g.region}</span>
                </div>
              </div>
              <span className={styles.muted}>
                {g.province} · {g.region}
              </span>
              <span>{formatCount(g.memberCount)}</span>
              <span>{formatCount(g.weeklyActive)}</span>
              <span className={styles.status}>{t('active')}</span>
              <div className={styles.actions}>
                <button type="button" className={styles.btn} onClick={() => actions.onEdit(g)}>
                  {t('edit')}
                </button>
                <button
                  type="button"
                  title={t('exportOneTitle')}
                  className={`${styles.btn} ${styles.btnBlue}`}
                  onClick={() => actions.onExport(g)}
                >
                  {t('exportOne')}
                </button>
                <button type="button" className={styles.btn} onClick={() => actions.onChat(g)}>
                  {t('chat')}
                </button>
                <button type="button" className={styles.btnDel} onClick={() => actions.onDelete(g)}>
                  {t('delete')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
