'use client';

import { DateRangePicker, ErrorState, PageHeader, PageSkeleton } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { StoreNeeds } from '@/features/needs';
import { ApiError } from '@/lib/api-client';
import { useStore } from '../hooks/use-stores';
import { DetailContact } from './detail-contact';
import { CardIcon } from './card-icon';
import { DetailHero } from './detail-hero';
import { DetailItems } from './detail-items';
import { StoreProjects } from './store-projects';
import { DetailDocs, DetailGallery, DetailReels } from './detail-media';
import { DetailCerts, DetailTeam, DetailVisionMission } from './detail-profile';
import styles from './detail.module.css';
import layout from './detail-layout.module.css';
import base from './stores.module.css';

const INTRO_ICON = 'M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M9 17h6';

/** Tiêu đề trang + khoảng ngày — prototype chỉ hiện ở trang chi tiết (`showPageHead`) */
function DetailPageHeader() {
  const t = useTranslations('stores.detail');
  return <PageHeader title={t('back')} extra={<DateRangePicker />} />;
}

/**
 * P-108: Chi tiết 1 trang (UP-08). Khối "Đang cần" (V4-609) sau Sản phẩm & Dịch vụ như prototype;
 * TIP-V42-710: Tầm nhìn & Sứ mệnh / Đội ngũ / Chứng nhận / Hình ảnh & Video / Reels / Hồ sơ năng lực
 * dữ liệu thật, chỉ hiện khi có — xếp 1 cột dưới Giới thiệu / Sản phẩm (không theo 2 cột của prototype
 * để giữ độ rộng khối Giới thiệu khớp khung đã đo, Q-V42-710-8); Thông tin liên hệ (REQ-510) cuối.
 */
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
      <DetailPageHeader />
      {s.status !== 'published' ? <div className={styles.preview}>{t('preview')}</div> : null}
      <DetailHero s={s} />
      <div className={layout.body}>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <CardIcon d={INTRO_ICON} />
            <span>{t('intro')}</span>
          </div>
          <div className={styles.introBody}>
            <div
              className={styles.introImg}
              style={s.coverUrl ? { backgroundImage: `url('${s.coverUrl}')` } : undefined}
            />
            <p className={styles.introText}>{s.intro}</p>
          </div>
        </section>
        <DetailItems items={s.items} />
        <StoreProjects store={s} />
        <StoreNeeds needs={s.openNeeds} />
        <DetailVisionMission s={s} />
        <DetailTeam s={s} />
        <DetailCerts s={s} />
        <DetailGallery s={s} />
        <DetailReels s={s} />
        <DetailDocs s={s} />
        <DetailContact s={s} />
      </div>
    </div>
  );
}
