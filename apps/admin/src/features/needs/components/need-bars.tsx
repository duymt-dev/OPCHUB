'use client';

import { useTranslations } from 'next-intl';
import styles from './needs.module.css';

interface BulkProps {
  count: number;
  canAct: boolean;
  onShow: () => void;
  onHide: () => void;
  onClear: () => void;
}

/** Prototype `hasSel`: "N nhu cầu đã chọn · Hiển thị · Ẩn … Bỏ chọn" */
export function NeedBulkBar(p: BulkProps) {
  const t = useTranslations('needs.bulk');
  return (
    <div className={styles.bulk} role="region" aria-label={t('label')}>
      <b>{t('selected', { n: p.count })}</b>
      {p.canAct ? (
        <>
          <button type="button" className={styles.bulkShow} onClick={p.onShow}>
            {t('show')}
          </button>
          <button type="button" className={styles.bulkHide} onClick={p.onHide}>
            {t('hide')}
          </button>
        </>
      ) : null}
      <span className={styles.grow} />
      <button type="button" data-ro-ok className={styles.bulkClear} onClick={p.onClear}>
        {t('clear')}
      </button>
    </div>
  );
}

interface PagerProps {
  page: number;
  pages: number;
  total: number;
  onPage: (p: number) => void;
}

/** Prototype `pgT`: "Trang x / y · N nhu cầu" + ‹ › */
export function NeedPager({ page, pages, total, onPage }: PagerProps) {
  const t = useTranslations('needs.pager');
  return (
    <div className={styles.pager}>
      <span>{t('text', { page, pages, total })}</span>
      <button
        type="button"
        aria-label={t('prev')}
        className={styles.pageBtn}
        onClick={() => onPage(Math.max(1, page - 1))}
      >
        ‹
      </button>
      <button
        type="button"
        aria-label={t('next')}
        className={styles.pageBtn}
        onClick={() => onPage(Math.min(pages, page + 1))}
      >
        ›
      </button>
    </div>
  );
}
