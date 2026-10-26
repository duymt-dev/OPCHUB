'use client';

import { useTranslations } from 'next-intl';
import type { KeyboardEvent } from 'react';
import { hasPendingRevision, vnDate } from '../model';
import type { AdminProject } from '../types';
import { useActLabel, type ProjectRowActions } from './project-grid';
import styles from './project-table.module.css';
import { FundraisingChip } from './fundraising-chip';
import { StatusBadge } from './status-badge';

type Mark = 'on' | 'part' | 'off';

/** Ô tick 16px như prototype (div role=checkbox để giữ cấu trúc bảng responsive) */
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
  items: AdminProject[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  actions: ProjectRowActions;
}

/** D-53 / D-54: bảng dự án (dạng danh sách) có chọn nhiều */
export function ProjectTable({ items, selected, onToggle, onToggleAll, actions }: Props) {
  const t = useTranslations('projects');
  const actLabel = useActLabel();
  const n = items.filter((p) => selected.has(p.id)).length;
  const all: Mark = n > 0 && n === items.length ? 'on' : n > 0 ? 'part' : 'off';
  return (
    <div className={styles.tbl} data-m="tbl">
      <div className={styles.inner}>
        <div className={`${styles.row} ${styles.head}`}>
          <Tick mark={all} label={t('selectAll')} onToggle={onToggleAll} />
          <span>{t('col.project')}</span>
          <span>{t('col.category')}</span>
          <span>{t('col.owner')}</span>
          <span>{t('col.date')}</span>
          <span>{t('col.status')}</span>
          <span />
        </div>
        {items.map((p) => {
          const on = selected.has(p.id);
          const pending = p.status === 'pending_review' || hasPendingRevision(p);
          return (
            <div key={p.id} className={`${styles.row} ${on ? styles.rowOn : ''}`}>
              <Tick
                mark={on ? 'on' : 'off'}
                label={t('selectRow', { name: p.name })}
                onToggle={() => onToggle(p.id)}
              />
              <div className={styles.nameCell}>
                <div className={styles.thumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- D-36: ảnh bìa mẫu, tự host sau */}
                  <img className={styles.img} src={p.coverUrl} alt="" />
                </div>
                <b>{p.name}</b>
              </div>
              <span className={styles.muted}>{p.category}</span>
              <div className={styles.owner}>
                <span>{p.ownerName}</span>
                <span className={styles.sub}>{p.country}</span>
              </div>
              <span className={styles.muted}>{vnDate(p.createdAt)}</span>
              <StatusBadge
                status={p.status}
                featured={p.featured}
                revision={hasPendingRevision(p)}
              />
              <div className={styles.actions}>
                <FundraisingChip p={p} onDecide={actions.onFundraising} />
                <button
                  type="button"
                  className={`${styles.act} ${pending ? styles.actPrimary : ''}`}
                  onClick={() => actions.onOpen(p)}
                >
                  {actLabel(p)}
                </button>
                <button
                  type="button"
                  title={t('act.delete')}
                  aria-label={t('act.delete')}
                  className={styles.del}
                  onClick={() => actions.onDelete(p)}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
