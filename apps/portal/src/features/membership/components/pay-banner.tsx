'use client';

import { useTranslations } from 'next-intl';
import { useMembership } from '../hooks/use-membership';
import { MEMBERSHIP_PLANS, planOf } from '@opchub/shared';
import { useAuthStore } from '@/lib/auth-store';
import { formatVnd } from '../model';
import { usePaywallStore } from '../store';
import styles from './pay-banner.module.css';

/**
 * P-88: banner nhắc phí đầu trang (prototype gán cứng `payBanner:false`). Hiện khi phí
 * chưa thanh toán / hết hạn và popup bắt buộc đang không che (đã mở hộp chuyển khoản…).
 */
export function PayBanner({ onPay }: { onPay: () => void }) {
  const t = useTranslations('membership.banner');
  const tp = useTranslations('membership.plans');
  const { data, status, mandatory } = useMembership();
  const hidden = usePaywallStore((s) => s.bannerHidden);
  const hide = usePaywallStore((s) => s.hideBanner);
  const plan = planOf(useAuthStore((s) => s.me?.accountType ?? 'personal')) ?? 'personal';
  if (!mandatory || hidden) return null;

  return (
    <div className={styles.banner} role="alert">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#FAAD14"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16h.01" />
      </svg>
      <div className={styles.text}>
        <b>
          {status !== 'expired' ? t('pending') : data?.neverPaid ? t('expiredTrial') : t('expired')}
        </b>
        <span>
          {t('body', {
            name: tp(`${plan}.name`),
            amount: formatVnd(data?.amount ?? MEMBERSHIP_PLANS[plan].amount),
            month: formatVnd(MEMBERSHIP_PLANS[plan].monthly),
          })}
        </span>
      </div>
      <button type="button" className={styles.pay} onClick={onPay}>
        {t('pay')}
      </button>
      <button type="button" className={styles.hide} aria-label={t('hide')} onClick={hide}>
        ×
      </button>
    </div>
  );
}
