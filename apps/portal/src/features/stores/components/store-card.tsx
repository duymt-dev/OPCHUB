'use client';

import type { StoreCard } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { storeInitials } from '../model';
import styles from './explore.module.css';

interface Props {
  s: StoreCard;
  onOpen: (id: string) => void;
}

const cover = (url: string | null) => (url ? { backgroundImage: `url('${url}')` } : undefined);

/** Thẻ lưới (prototype `st.list` dạng grid) — bỏ tim / lượt xem / badge (Q-V4-608-5) */
export function StoreGridCard({ s, onOpen }: Props) {
  const t = useTranslations('stores');
  return (
    <button type="button" className={styles.gCard} onClick={() => onOpen(s.id)}>
      <span className={styles.gCover} style={cover(s.coverUrl)} />
      <span className={styles.gBody}>
        <span className={styles.gLoc}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="rgba(0,0,0,0.55)"
            aria-hidden="true"
          >
            <path d="M12 2a7 7 0 00-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5.5z" />
          </svg>
          {s.province}
        </span>
        <span className={styles.gName}>{s.name}</span>
        <span className={styles.gSlogan}>{s.slogan}</span>
        <span className={styles.gTags}>
          {s.field ? <span className={styles.gTag}>{s.field}</span> : null}
        </span>
        <span className={styles.gFoot}>
          <span className={styles.gIni}>{storeInitials(s.name)}</span>
          <span className={styles.gKind}>{t(`audience.${s.audience}`)}</span>
          <span className={styles.gItems} title={t('itemsCount', { n: s.itemCount })}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 8l-9-5-9 5 9 5zM3 8v8l9 5 9-5V8" />
            </svg>
            {s.itemCount}
          </span>
        </span>
      </span>
    </button>
  );
}

/** Dòng danh sách (prototype `st.isRows`) */
export function StoreRow({ s, onOpen }: Props) {
  const t = useTranslations('stores');
  return (
    <button type="button" className={styles.row} onClick={() => onOpen(s.id)}>
      <span className={styles.rCover} style={cover(s.coverUrl)} />
      <span className={styles.rBody}>
        <span className={styles.rHead}>
          <span className={styles.rName}>{s.name}</span>
          <span className={styles.rLoc}>{s.province}</span>
        </span>
        <span className={styles.rSlogan}>{s.slogan}</span>
        <span className={styles.gTags}>
          {s.field ? <span className={styles.gTag}>{s.field}</span> : null}
        </span>
      </span>
      <span className={styles.rItems}>{t('itemsCount', { n: s.itemCount })}</span>
      <span className={styles.rMore}>{t('viewDetail')}</span>
    </button>
  );
}
