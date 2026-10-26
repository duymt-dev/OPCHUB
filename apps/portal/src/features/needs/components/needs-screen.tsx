'use client';

import { Icon, PageHeader } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { PAYWALL_PATHS, openInPlace } from '@/features/membership';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { useNeedActions } from '../hooks/use-need-actions';
import { useMyNeeds } from '../hooks/use-needs';
import { NeedForm } from './need-form';
import { NeedsAll } from './needs-all';
import { NeedsMine } from './needs-mine';
import styles from './needs.module.css';

type Tab = 'all' | 'mine';

/** Tiêu đề trang + ô khoảng ngày (prototype `showPageHead` / `showRange`, pageSub rỗng) */
function PageHead() {
  const t = useTranslations('needs.header');
  return (
    <PageHeader
      title={t('title')}
      // Prototype có dòng mô tả rỗng (pageSub '') vẫn chiếm khoảng cách 4px; khoảng trắng → cao 0
      subtitle=" "
      extra={
        <div className={styles.dateRange}>
          <Icon name="calendar" stroke="rgba(0,0,0,0.65)" />
          {t('dateRange')}
          <Icon name="chevronDown" size={14} stroke="rgba(0,0,0,0.45)" />
        </div>
      }
    />
  );
}

function Header({ onPost, busy }: { onPost: () => void; busy: boolean }) {
  const t = useTranslations('needs.header');
  return (
    <div className={`${styles.card} ${styles.head}`}>
      <div className={styles.headText}>
        <span className={styles.headTitle}>{t('title')}</span>
        <span className={styles.headSub}>{t('sub')}</span>
      </div>
      <button type="button" className={styles.postBtn} disabled={busy} onClick={onPost}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        {t('post')}
      </button>
    </div>
  );
}

function Tabs({ active }: { active: Tab }) {
  const t = useTranslations('needs.tabs');
  const router = useRouter();
  const tabs = [
    { key: 'all' as const, href: '/needs' },
    { key: 'mine' as const, href: '/needs/mine' },
  ];
  return (
    <div className={styles.tabs} role="tablist">
      {tabs.map((x) => (
        <button
          key={x.key}
          type="button"
          role="tab"
          aria-selected={active === x.key}
          className={`${styles.tab} ${active === x.key ? styles.tabOn : ''}`}
          onClick={() => active !== x.key && router.push(x.href)}
        >
          {t(x.key)}
        </button>
      ))}
    </div>
  );
}

/**
 * P-111 → P-116: Nhu cầu địa phương (UP-09, REQ-511) — orchestrator 2 tab + popup Đăng nhu cầu.
 * Đăng chỉ cho chủ gian hàng: TK Cá nhân → tab "của tôi" (giải thích); DN chưa có gian hàng → thanh toán.
 */
export function NeedsScreen({ tab }: { tab: Tab }) {
  const router = useRouter();
  const me = useAuthStore((s) => s.me);
  const isBiz = me?.accountType === 'business';
  const mine = useMyNeeds(isBiz);
  const act = useNeedActions();
  const [formOpen, setFormOpen] = useState(false);
  const closeForm = useCallback(() => setFormOpen(false), []);
  const status = mine.error instanceof ApiError ? mine.error.status : null;
  const locked = !me ? null : !isBiz || status === 403 ? 'biz' : status === 402 ? 'pay' : null;
  const store = mine.data?.store ?? null;

  const onPost = () => {
    if (locked === 'biz') return router.push('/needs/mine');
    if (!store) return void openInPlace(PAYWALL_PATHS.pay);
    setFormOpen(true);
  };

  return (
    <>
      <PageHead />
      <div className={styles.screen} data-screen={tab === 'all' ? 'needs-list' : 'needs-mine'}>
        <Header onPost={onPost} busy={!!me && isBiz && mine.isPending} />
        <Tabs active={tab} />
        {tab === 'all' ? (
          <NeedsAll />
        ) : (
          <NeedsMine
            q={mine}
            locked={locked}
            busy={act.busy}
            onClose={act.close}
            onReopen={act.reopen}
            onDelete={(n) => act.remove(n.id)}
          />
        )}
        {formOpen && store ? (
          <NeedForm
            store={store}
            contact={{ name: me?.fullName ?? '', email: me?.email ?? '' }}
            busy={act.busy}
            onCancel={closeForm}
            onSubmit={(body) =>
              act.create(body, () => {
                setFormOpen(false);
                if (tab !== 'mine') router.push('/needs/mine');
              })
            }
          />
        ) : null}
      </div>
    </>
  );
}
