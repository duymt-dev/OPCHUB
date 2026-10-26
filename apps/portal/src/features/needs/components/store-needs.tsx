'use client';

import type { StoreNeed } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { dueText } from '../model';
import { TypeChip } from './need-bits';
import styles from './needs.module.css';

const MEGAPHONE =
  'M3 11v2a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1zM15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13';

/** Khối "Đang cần" ở chi tiết gian hàng (prototype `st.d.hasNeeds`) — ẩn khi không có nhu cầu mở */
export function StoreNeeds({ needs }: { needs: StoreNeed[] }) {
  const t = useTranslations('needs');
  const router = useRouter();
  if (!needs.length) return null;
  return (
    <section className={styles.card} data-block="store-needs">
      <div className={styles.storeHead}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(0,0,0,0.88)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={MEGAPHONE} />
        </svg>
        <span className={styles.storeTitle}>{t('store.title')}</span>
        <button type="button" className={styles.storeMore} onClick={() => router.push('/needs')}>
          {t('store.more')}
        </button>
      </div>
      <div className={styles.storeGrid}>
        {needs.map((n) => (
          <div key={n.id} className={styles.storeItem}>
            <div className={styles.storeItemTop}>
              <TypeChip type={n.type} />
              <span className={styles.muted}>
                {dueText(n, { due: t('due'), none: t('noDue') })}
              </span>
            </div>
            <span className={styles.storeItemTitle}>{n.title}</span>
            <span className={styles.storeItemQty}>{t('scale', { qty: n.quantity || '—' })}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Badge "Đang tìm đối tác" góc trên ảnh bìa thẻ gian hàng (prototype `badge`, #389E0D) */
export function SeekingBadge() {
  const t = useTranslations('needs.store');
  return <span className={styles.seeking}>{t('seeking')}</span>;
}
