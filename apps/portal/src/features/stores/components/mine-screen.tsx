'use client';

import type { StoreDetail, StoreUpsert } from '@opchub/shared/api-domains';
import { ErrorState, PageSkeleton } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PAYWALL_PATHS, openInPlace } from '@/features/membership';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { useStoreActions } from '../hooks/use-store-actions';
import { useStoreImages } from '../hooks/use-store-images';
import { useMyStore } from '../hooks/use-stores';
import { toDraft } from '../model';
import { MineInfo } from './mine-info';
import { MineItems } from './mine-items';
import { MineSide } from './mine-side';
import styles from './mine.module.css';
import base from './stores.module.css';
import { StoreTabs } from './store-tabs';

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

/** Bản đang sửa giữ theo `updatedAt` của server: lưu xong → nạp lại từ phản hồi */
function Editor({ store }: { store: StoreDetail }) {
  const t = useTranslations('stores.mine');
  const router = useRouter();
  const act = useStoreActions();
  const img = useStoreImages();
  const [draft, setDraft] = useState<StoreUpsert>(() => toDraft(store));
  const set = (patch: Partial<StoreUpsert>) => setDraft((d) => ({ ...d, ...patch }));
  const busy = act.busy || img.uploading;
  return (
    <>
      {store.status === 'draft' && store.itemCount === 0 ? (
        <div className={styles.autoBanner}>{t.rich('auto', { b: (c) => <b>{c}</b> })}</div>
      ) : null}
      {store.status === 'hidden' ? <div className={styles.hiddenBanner}>{t('hidden')}</div> : null}
      <div className={styles.cols}>
        <div className={styles.colMain}>
          <MineInfo draft={draft} status={store.status} set={set} pickCover={img.pickCover} />
          <MineItems
            items={draft.items}
            pickItem={img.pickItem}
            commit={(items, text) => {
              set({ items });
              act.save({ ...draft, items }, text);
            }}
          />
        </div>
        <MineSide
          draft={draft}
          status={store.status}
          busy={busy}
          onPublish={() => act.publish(store, draft)}
          onSave={() => act.save(draft)}
          onView={() => router.push(`/stores/${encodeURIComponent(store.id)}`)}
          onUnpublish={act.unpublish}
        />
      </div>
    </>
  );
}

/** P-109 / P-110: Gian hàng của tôi (UT-09) — bỏ dashboard số liệu giả (Q-V4-608-6) */
export function StoreMineScreen() {
  const tState = useTranslations('common.state');
  const me = useAuthStore((s) => s.me);
  const isBiz = me?.accountType === 'business';
  const q = useMyStore(isBiz);
  const status = q.error instanceof ApiError ? q.error.status : null;

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
  ) : !q.data ? (
    <PageSkeleton />
  ) : (
    <Editor key={q.data.id} store={q.data} />
  );

  return (
    <div className={base.screen} data-screen="stores-mine">
      <StoreTabs active="mine" />
      {body}
    </div>
  );
}
