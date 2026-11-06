'use client';

import type { StoreDetail } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { CardIcon } from './card-icon';
import styles from './detail.module.css';
import p from './detail-profile.module.css';

const GALLERY_ICON = 'M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6M15 9h.01';
const DOC_ICON = 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z';
const PLAY = 'M7 4v16l13-8z';

/** "Hình ảnh & Video" (prototype :2352) — hàng cuộn ngang, ảnh thật đã tải lên */
export function DetailGallery({ s }: { s: Pick<StoreDetail, 'gallery'> }) {
  const t = useTranslations('stores.detail');
  if (s.gallery.length === 0) return null;
  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <CardIcon d={GALLERY_ICON} />
        <span>{t('profile.gallery')}</span>
      </div>
      <div className={p.row}>
        {s.gallery.map((src) => (
          <div key={src} className={p.pic} style={{ backgroundImage: `url('${src}')` }} />
        ))}
      </div>
    </section>
  );
}

/** "Reels" (prototype :2353) — video thật 9:16, nút play, tên video */
export function DetailReels({ s }: { s: StoreDetail }) {
  const t = useTranslations('stores.detail');
  if (s.videos.length === 0) return null;
  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
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
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M3 8h18M8 3l3 5M14 3l3 5M10 12v6l5-3z" />
        </svg>
        <span>{t('profile.reels')}</span>
      </div>
      <div className={p.reelsGrid}>
        {s.videos.map((v) => (
          <div key={v.url} className={p.reel}>
            <video src={v.url} muted playsInline preload="metadata" className={p.reelVideo} />
            <span className={p.reelPlay}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#1677FF" aria-hidden="true">
                <path d={PLAY} />
              </svg>
            </span>
            <span className={p.reelTitle}>{v.title}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** "Hồ sơ năng lực" (prototype :2338 → 2339) — tải tệp thật (PDF / PPT / DOC) */
export function DetailDocs({ s }: { s: StoreDetail }) {
  const t = useTranslations('stores.detail');
  if (s.docs.length === 0) return null;
  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <CardIcon d={DOC_ICON} />
        <span>{t('profile.docs')}</span>
      </div>
      <div className={p.docRow}>
        {s.docs.map((d) => (
          <a key={d.url} href={d.url} target="_blank" rel="noopener noreferrer" className={p.doc}>
            <span className={p.docExt}>{d.ext}</span>
            <div className={p.docText}>
              <span className={p.docName}>{d.name}</span>
              <span className={p.docSize}>
                {d.ext} · {d.size}
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
