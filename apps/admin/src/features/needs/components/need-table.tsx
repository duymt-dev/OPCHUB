'use client';

import type { AdminNeed } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { allChecked, needDate, needLoc, needSub } from '../model';
import styles from './need-table.module.css';
import { NeedStatusTag, NeedTypeTag } from './need-tags';

interface Props {
  rows: AdminNeed[];
  sel: ReadonlySet<string>;
  canAct: boolean;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onHide: (id: string) => void;
  onShow: (id: string) => void;
}

/** Bảng 8 cột prototype `aNeeds` (min-width 1040, cuộn ngang; ≤ 1023px dồn 1 cột) */
export function NeedTable(p: Props) {
  const t = useTranslations('needs.table');
  const ids = p.rows.map((r) => r.id);
  return (
    <div className={styles.scroll}>
      <div className={styles.grid} role="table" aria-label={t('label')}>
        <div className={`${styles.row} ${styles.head}`} role="row">
          <input
            type="checkbox"
            aria-label={t('all')}
            checked={allChecked(p.sel, ids)}
            onChange={p.onToggleAll}
          />
          <span>{t('need')}</span>
          <span>{t('type')}</span>
          <span>{t('store')}</span>
          <span>{t('area')}</span>
          <span>{t('date')}</span>
          <span>{t('status')}</span>
          <span className={styles.right}>{t('actions')}</span>
        </div>
        {p.rows.map((r) => (
          <div key={r.id} className={styles.row} role="row" data-need={r.id}>
            <input
              type="checkbox"
              aria-label={r.title}
              checked={p.sel.has(r.id)}
              onChange={() => p.onToggle(r.id)}
            />
            <div className={styles.need}>
              <span className={`${styles.title} ${styles.ellipsis}`}>{r.title}</span>
              <span className={styles.sub}>{needSub(r)}</span>
            </div>
            <span>
              <NeedTypeTag type={r.type} />
            </span>
            <span className={`${styles.muted} ${styles.ellipsis}`}>{r.store.name || '—'}</span>
            <span className={styles.muted}>{needLoc(r)}</span>
            <span className={styles.muted}>{needDate(r.updatedAt)}</span>
            <span>
              <NeedStatusTag status={r.status} />
            </span>
            <span className={styles.acts}>
              {p.canAct && r.status !== 'hidden' ? (
                <button type="button" className={styles.hide} onClick={() => p.onHide(r.id)}>
                  {t('hide')}
                </button>
              ) : null}
              {p.canAct && r.status === 'hidden' ? (
                <button type="button" className={styles.show} onClick={() => p.onShow(r.id)}>
                  {t('show')}
                </button>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
