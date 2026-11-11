'use client';

import type { AdminStore } from '@opchub/shared/api-domains';
import { useLocale, useTranslations } from 'next-intl';
import { allChecked, storeDate, storeInitials } from '../model';
import { StoreStatusTag, StoreThumb } from './store-status';
import styles from './store-table.module.css';

interface Props {
  rows: AdminStore[];
  sel: ReadonlySet<string>;
  canAct: boolean;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onOpen: (id: string) => void;
  onHide: (id: string) => void;
  onShow: (id: string) => void;
}

/** Bảng 8 cột prototype `aStores` (min-width 960, cuộn ngang ở màn hẹp) */
export function StoreTable(p: Props) {
  const locale = useLocale();
  const t = useTranslations('stores.table');
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
          <span>{t('store')}</span>
          <span>{t('field')}</span>
          <span>{t('province')}</span>
          <span className={styles.right}>{t('items')}</span>
          <span>{t('updated')}</span>
          <span>{t('status')}</span>
          <span className={styles.right}>{t('actions')}</span>
        </div>
        {p.rows.map((r) => (
          <div key={r.id} className={styles.row} role="row" data-store={r.id}>
            <input
              type="checkbox"
              aria-label={r.name}
              checked={p.sel.has(r.id)}
              onChange={() => p.onToggle(r.id)}
            />
            <button type="button" data-ro-ok className={styles.name} onClick={() => p.onOpen(r.id)}>
              <StoreThumb url={r.coverUrl} initials={storeInitials(r.name)} />
              <span className={styles.ellipsis}>{r.name}</span>
            </button>
            <span className={styles.muted}>{r.field}</span>
            <span className={styles.muted}>{r.province}</span>
            <span className={styles.right}>{r.itemCount}</span>
            <span className={styles.muted}>{storeDate(r.updatedAt, locale)}</span>
            <span>
              <StoreStatusTag status={r.status} />
            </span>
            <span className={styles.acts}>
              <button type="button" className={styles.view} onClick={() => p.onOpen(r.id)}>
                {t('view')}
              </button>
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
