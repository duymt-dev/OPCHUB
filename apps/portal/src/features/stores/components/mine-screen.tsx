'use client';

import type { StoreStep } from '@opchub/shared/api-domains';
import { ErrorState, PageSkeleton } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PAYWALL_PATHS, openInPlace } from '@/features/membership';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { useMyStore } from '../hooks/use-stores';
import { StoreDashboard } from './dashboard/store-dashboard';
import styles from './mine.module.css';
import base from './stores.module.css';
import { StoreTabs } from './store-tabs';
import { StoreWizard } from './wizard/store-wizard';

/** TK Cá nhân (403) / chưa có gian hàng do chưa đóng phí (404) — copy prototype `notBiz` */
function Locked({ kind }: { kind: 'pay' | 'biz' }) {
  const t = useTranslations('stores.mine');
  return (
    <div className={`${base.card} ${styles.locked}`}>
      <span className={styles.lockedTitle}>{t(kind === 'pay' ? 'payTitle' : 'bizTitle')}</span>
      <span className={styles.lockedText}>{t(kind === 'pay' ? 'payText' : 'bizText')}</span>
      {kind === 'pay' ? (
        <button
          type="button"
          className={`${base.btn} ${base.btnPrimary} ${styles.lockedBtn}`}
          onClick={() => openInPlace(PAYWALL_PATHS.pay)}
        >
          {t('payBtn')}
        </button>
      ) : null}
    </div>
  );
}

type Mode = { on: false } | { on: true; edit: boolean; step: StoreStep };

/**
 * P-109 / P-110 "Gian hàng của tôi" (D-114 S6, prototype `wzOn` / `editMode` / `dashMode`, index.html
 * :1992 → 2235): dashboard số thật mặc định; gian hàng tự tạo còn trống (chưa giới thiệu, chưa SP) mở
 * thẳng trình tạo 5 bước; "Chỉnh sửa gian hàng" / "Quản lý" mở trình tạo ở chế độ sửa (bước 1 / bước 4).
 */
export function StoreMineScreen() {
  const tState = useTranslations('common.state');
  const router = useRouter();
  const me = useAuthStore((s) => s.me);
  const isBiz = me?.accountType === 'business';
  const q = useMyStore(isBiz);
  const status = q.error instanceof ApiError ? q.error.status : null;
  const store = q.data;
  const autoEmpty = !!store?.autoCreated && !store.intro.trim() && store.items.length === 0;
  const [mode, setMode] = useState<Mode>({ on: false });
  const open = autoEmpty ? { on: true, edit: false, step: 1 as StoreStep } : mode;

  const body = !me ? (
    <PageSkeleton />
  ) : !isBiz || status === 403 ? (
    <Locked kind="biz" />
  ) : status === 404 || status === 402 ? (
    <Locked kind="pay" />
  ) : q.isError ? (
    <ErrorState
      title={tState('error')}
      retryLabel={tState('retry')}
      onRetry={() => void q.refetch()}
    />
  ) : !store ? (
    <PageSkeleton />
  ) : open.on ? (
    <StoreWizard
      key={store.id}
      store={store}
      edit={open.edit}
      initialStep={open.step}
      onExit={() => setMode({ on: false })}
    />
  ) : (
    <StoreDashboard
      store={store}
      onEdit={(step) => setMode({ on: true, edit: true, step: step ?? 1 })}
      onView={() => router.push(`/stores/${encodeURIComponent(store.id)}`)}
    />
  );

  return (
    <div className={base.screen} data-screen="stores-mine">
      <StoreTabs active="mine" />
      {body}
    </div>
  );
}
