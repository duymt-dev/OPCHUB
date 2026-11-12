'use client';

import { useTranslations } from 'next-intl';
import styles from './stores.module.css';
import { useNumberText } from '@/i18n/use-number-text';

interface BulkProps {
  count: number;
  canAct: boolean;
  onShow: () => void;
  onHide: () => void;
  onClear: () => void;
}

/** Prototype `hasSel`: "N gian hàng đã chọn · Hiển thị · Ẩn … Bỏ chọn" */
export function StoreBulkBar(p: BulkProps) {
  const numberText = useNumberText();
  const t = useTranslations('stores.bulk');
  return (
    <div className={styles.bulk} role="region" aria-label={t('label')}>
      <b>{t('selected', { n: numberText(p.count) })}</b>
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

/** Prototype `pgT`: "Trang x / y · N gian hàng" + ‹ › */
export function StorePager({ page, pages, total, onPage }: PagerProps) {
  const numberText = useNumberText();
  const t = useTranslations('stores.pager');
  return (
    <div className={styles.pager}>
      <span>
        {t('text', { page: numberText(page), pages: numberText(pages), total: numberText(total) })}
      </span>
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
