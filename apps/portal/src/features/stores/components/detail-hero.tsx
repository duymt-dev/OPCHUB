'use client';

import type { StoreDetail } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { storeInitials, storeLocation, storeShortName, webLink } from '../model';
import styles from './detail.module.css';

const EXT = 'M14 3h7v7M10 14L21 3M21 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h5';
const SHARE =
  'M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4';
const FIELD = 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6';
const PIN =
  'M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z';

function Svg({ d, size = 14 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

/** Nút "Xem trang hồ sơ công khai" / "Chia sẻ" — chép link gian hàng (prototype `st.d.share`) */
function HeroActions({ s }: { s: StoreDetail }) {
  const t = useTranslations('stores.detail');
  const toast = useToast();
  const router = useRouter();
  const share = () => {
    const url = `${window.location.origin}/stores/${s.id}`;
    void navigator.clipboard?.writeText(url).catch(() => undefined);
    toast(t('shared', { url }));
  };
  return (
    <div className={styles.heroBtns}>
      <button type="button" className={styles.btnPub} onClick={share}>
        {t('publicPage')} <Svg d={EXT} size={13} />
      </button>
      <button type="button" className={styles.btnShare} onClick={share}>
        <Svg d={SHARE} />
        {t('share')}
      </button>
      {s.isMine ? (
        <button
          type="button"
          className={styles.btnEdit}
          onClick={() => router.push('/stores/mine')}
        >
          {t('edit')}
        </button>
      ) : null}
    </div>
  );
}

/** Hero chi tiết (prototype index.html 2110–2132): logo chữ, tên, slogan, ngành, địa chỉ, web */
export function DetailHero({ s }: { s: StoreDetail }) {
  const t = useTranslations('stores.detail');
  const router = useRouter();
  const web = webLink(s.website);
  const loc = storeLocation(s) || s.province;
  return (
    <div className={styles.hero}>
      <div
        className={styles.heroImg}
        style={s.coverUrl ? { backgroundImage: `url('${s.coverUrl}')` } : undefined}
      />
      <div className={styles.heroFade} />
      <div className={styles.heroBody}>
        <div className={styles.crumbs}>
          <button type="button" className={styles.crumbBack} onClick={() => router.push('/stores')}>
            ‹ &nbsp;{t('back')}
          </button>
          <span className={styles.crumbSep}>›</span>
          <span className={styles.crumbName}>{s.name}</span>
          <HeroActions s={s} />
        </div>
        <div className={styles.idRow}>
          {s.logoUrl ? (
            <div className={`${styles.logo} ${styles.logoImg}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- logo storage động */}
              <img src={s.logoUrl} alt="" />
            </div>
          ) : (
            <div className={styles.logo}>
              <span className={styles.logoIni}>{storeInitials(s.name)}</span>
              <span className={styles.logoName}>{storeShortName(s.name)}</span>
            </div>
          )}
          <div className={styles.idText}>
            <span className={styles.name}>{s.name}</span>
            <span className={styles.slogan}>{s.slogan}</span>
            <div className={styles.meta}>
              {s.field ? (
                <span className={styles.metaItem}>
                  <Svg d={FIELD} />
                  {s.field}
                </span>
              ) : null}
              {loc ? (
                <span className={styles.metaItem}>
                  <Svg d={PIN} />
                  {loc}
                </span>
              ) : null}
              {web ? (
                <a
                  href={web}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.web}
                  aria-label={s.website}
                >
                  <Svg d={EXT} />
                </a>
              ) : null}
            </div>
          </div>
        </div>
        <span className={styles.heroIntro}>{s.intro}</span>
        {s.field ? (
          <div className={styles.heroTags}>
            <span className={styles.heroTag}>{s.field}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
