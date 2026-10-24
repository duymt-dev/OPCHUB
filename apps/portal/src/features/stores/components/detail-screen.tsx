'use client';

import type { StoreDetail } from '@opchub/shared/api-domains';
import { ErrorState, PageSkeleton } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api-client';
import { useStore } from '../hooks/use-stores';
import { storeInitials, storeShortName, webLink } from '../model';
import { DetailContact } from './detail-contact';
import { DetailItems } from './detail-items';
import styles from './detail.module.css';
import base from './stores.module.css';

function Hero({ s }: { s: StoreDetail }) {
  const t = useTranslations('stores.detail');
  const router = useRouter();
  const web = webLink(s.website);
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
          {s.isMine ? (
            <button
              type="button"
              className={`${base.btn} ${base.btnPrimary}`}
              onClick={() => router.push('/stores/mine')}
            >
              {t('edit')}
            </button>
          ) : null}
        </div>
        <div className={styles.idRow}>
          <div className={styles.logo}>
            <span className={styles.logoIni}>{storeInitials(s.name)}</span>
            <span className={styles.logoName}>{storeShortName(s.name)}</span>
          </div>
          <div className={styles.idText}>
            <span className={styles.name}>{s.name}</span>
            <span className={styles.slogan}>{s.slogan}</span>
            <div className={styles.meta}>
              {s.field ? <span>{s.field}</span> : null}
              {s.province ? <span>{s.province}</span> : null}
              {web ? (
                <a href={web} target="_blank" rel="noopener noreferrer" className={styles.web}>
                  {s.website}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** P-107 / P-108: Chi tiết 1 trang (UP-08) — bỏ Hồ sơ năng lực / Đội ngũ / Reels (Q-V4-608-6) */
export function StoreDetailScreen({ id }: { id: string }) {
  const t = useTranslations('stores.detail');
  const tState = useTranslations('common.state');
  const router = useRouter();
  const q = useStore(id);

  if (q.isError) {
    const missing = q.error instanceof ApiError && q.error.status === 404;
    return (
      <ErrorState
        title={missing ? t('notFound') : tState('error')}
        {...(missing ? { description: t('notFoundSub') } : {})}
        retryLabel={missing ? t('back') : tState('retry')}
        onRetry={() => (missing ? router.push('/stores') : void q.refetch())}
      />
    );
  }
  if (!q.data) return <PageSkeleton />;
  const s = q.data;
  return (
    <div className={base.screen} data-screen="stores-detail">
      {s.status !== 'published' ? <div className={styles.preview}>{t('preview')}</div> : null}
      <Hero s={s} />
      <div className={styles.cols}>
        <div className={styles.colMain}>
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <span>{t('intro')}</span>
            </div>
            <div className={styles.introBody}>
              {s.coverUrl ? (
                <div
                  className={styles.introImg}
                  style={{ backgroundImage: `url('${s.coverUrl}')` }}
                />
              ) : null}
              <p className={styles.introText}>{s.intro}</p>
            </div>
          </section>
          <DetailItems items={s.items} />
        </div>
        <DetailContact s={s} />
      </div>
    </div>
  );
}
