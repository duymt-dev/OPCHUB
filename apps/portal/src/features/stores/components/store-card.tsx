'use client';

import type { StoreCard } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { SeekingBadge } from '@/features/needs';
import { storeInitials } from '../model';
import card from './store-card.module.css';
import styles from './explore.module.css';

interface Props {
  s: StoreCard;
  onOpen: (id: string) => void;
}

const cover = (url: string | null) => (url ? { backgroundImage: `url('${url}')` } : undefined);
const views = new Intl.NumberFormat('vi-VN');

/** Prototype `st.list`: "Nổi bật" (Admin gắn) thắng "Đang tìm đối tác" */
function CardBadge({ s }: { s: StoreCard }) {
  const t = useTranslations('stores');
  if (s.featured) return <span className={card.gHot}>{t('card.hot')}</span>;
  return s.seeking ? <SeekingBadge /> : null;
}

/** Tim "Quan tâm" — bấm không mở chi tiết */
function FavButton({ s, onFav }: { s: StoreCard; onFav: (s: StoreCard) => void }) {
  const t = useTranslations('stores');
  return (
    <button
      type="button"
      className={card.gFav}
      title={t('card.fav')}
      aria-label={t('card.fav')}
      aria-pressed={s.fav}
      onClick={(e) => {
        e.stopPropagation();
        onFav(s);
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={s.fav ? '#FF4D4F' : 'none'}
        stroke={s.fav ? '#FF4D4F' : 'rgba(0,0,0,0.65)'}
        strokeWidth="1.8"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 20.5s-7.5-4.6-9.3-9.3C1.4 7.6 3.9 4 7.4 4c2 0 3.5 1.1 4.6 2.6C13.1 5.1 14.6 4 16.6 4c3.5 0 6 3.6 4.7 7.2-1.8 4.7-9.3 9.3-9.3 9.3z" />
      </svg>
    </button>
  );
}

/**
 * Thẻ lưới (prototype `st.list` dạng grid, D-89 / P-105): badge Nổi bật / Đang tìm đối tác, tim
 * yêu thích, lượt xem. Thẻ là `role=link` (trong có nút tim, không lồng button).
 */
export function StoreGridCard({ s, onOpen, onFav }: Props & { onFav: (s: StoreCard) => void }) {
  const t = useTranslations('stores');
  return (
    <div
      className={styles.gCard}
      role="link"
      tabIndex={0}
      onClick={() => onOpen(s.id)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(s.id)}
    >
      <span className={styles.gCover} style={cover(s.coverUrl)}>
        <CardBadge s={s} />
        <FavButton s={s} onFav={onFav} />
      </span>
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
          {[s.field, s.legalForm]
            .filter((l, i, a) => l && a.indexOf(l) === i)
            .map((l) => (
              <span key={l} className={styles.gTag}>
                {l}
              </span>
            ))}
        </span>
        <span className={styles.gFoot}>
          <span className={styles.gIni}>{storeInitials(s.name)}</span>
          <span className={styles.gKind}>{t(`audience.${s.audience}`)}</span>
          <span className={styles.gItems} title={t('card.views', { n: s.views })}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {views.format(s.views)}
          </span>
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
    </div>
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
