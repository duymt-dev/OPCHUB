'use client';

import { PaywallModal } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { ConsultForm, RequestDone, ServiceList } from '@/features/services';
import { useMembership } from '../hooks/use-membership';
import { useMembershipPush } from '../hooks/use-membership-push';
import { usePaywall } from '../hooks/use-paywall';
import { PayBanner } from './pay-banner';
import { PayModal } from './pay-modal';
import styles from './paywall-gate.module.css';
import { PlanPanel } from './plan-panel';

function BackLink({ onClick }: { onClick: () => void }) {
  const t = useTranslations('services.form');
  return (
    <button type="button" className={styles.back} onClick={onClick}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {t('back')}
    </button>
  );
}

/**
 * Gắn trong khung Portal: hộp Gói dịch vụ (P-79 → P-83), chuyển khoản (P-84 → P-86),
 * popup bắt buộc với TK chưa đóng phí (P-87, BR-03, D-28) và banner nhắc phí (P-88).
 */
export function PaywallGate({ children }: { children: ReactNode }) {
  const t = useTranslations('membership.popup');
  const p = usePaywall();
  const { data } = useMembership();
  useMembershipPush();
  // Chuyển khoản mở từ trang Bảng giá: trang vẫn hiện phía sau hộp chuyển khoản
  const box = p.view && p.view !== 'pay' ? p.view : p.asPage ? 'list' : null;

  return (
    <>
      {p.view === 'pay' ? null : <PayBanner onPay={() => p.toPay(false)} />}
      <PaywallModal
        open={!!box}
        mandatory={p.mandatory}
        title={t('title')}
        wide={box === 'list'}
        fit
        page={p.asPage}
        scrollKey={`${box ?? ''}${p.request?.code ?? ''}`}
        labels={{ close: t('close'), mustPay: t('mustPay'), logout: t('logout') }}
        back={box === 'form' ? <BackLink onClick={p.toList} /> : undefined}
        onClose={p.close}
        onBlocked={p.blocked}
        onLogout={p.logout}
      >
        {box === 'list' ? (
          <div className={styles.grid}>
            <PlanPanel onJoin={() => p.toPay(true)} onClose={p.close} />
            <ServiceList onConsult={p.toForm} />
          </div>
        ) : null}
        {box === 'form' && p.svcId ? (
          <ConsultForm key={p.svcId} svcId={p.svcId} onCancel={p.toList} onSent={p.toDone} />
        ) : null}
        {box === 'done' && p.request ? <RequestDone r={p.request} onBack={p.toList} /> : null}
      </PaywallModal>
      {p.view === 'pay' && data ? (
        <PayModal m={data} onBack={p.backFromPay} onDone={p.close} />
      ) : null}
      {/* Bảng giá dạng trang thay màn đang xem (prototype `pTab=services`) */}
      {p.asPage ? null : children}
    </>
  );
}
