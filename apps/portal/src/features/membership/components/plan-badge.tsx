'use client';

import { planOf } from '@opchub/shared';
import { Icon } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/auth-store';
import { useMembership } from '../hooks/use-membership';
import { formatDate, isActive, planCountdown } from '../model';
import { openPricingPopup } from '../navigation';
import styles from './plan-badge.module.css';

/**
 * Chân sidebar Portal v4 (prototype `sbFoot` / `prBill`): gói theo loại TK (D-68), trạng thái,
 * hạn + thanh còn lại, nút thanh toán / gia hạn, "Xem bảng giá". NĐT không có phí (D-14) → ẩn.
 */
export function PlanBadge() {
  const t = useTranslations('membership.badge');
  const tp = useTranslations('membership.plans');
  const accountType = useAuthStore((s) => s.me?.accountType);
  const { data, status, now } = useMembership();
  const plan = accountType ? planOf(accountType) : null;
  if (!plan || !status) return null;

  const until = data?.validUntil ?? null;
  const { active, left, pct, soon } = planCountdown(until, isActive(status), now);

  return (
    <section className={styles.card} aria-label={t('title')}>
      <div className={styles.head}>
        <span className={styles.icon}>
          <Icon name="star" size={20} strokeWidth={1.8} />
        </span>
        <div className={styles.name}>
          <span className={styles.pkg}>{tp(`${plan}.name`)}</span>
          <span className={styles.state} data-on={active ? '1' : '0'}>
            {t(active ? 'active' : 'inactive')}
          </span>
        </div>
      </div>
      <div className={styles.until}>
        <div className={styles.row}>
          <span className={styles.label}>{t('until')}</span>
          <b>{active ? formatDate(until) : '—'}</b>
        </div>
        <div className={styles.bar}>
          <div className={styles.fill} data-soon={soon ? '1' : '0'} style={{ width: `${pct}%` }} />
        </div>
        <span className={styles.left} data-soon={soon ? '1' : '0'}>
          {active ? t('left', { n: left }) : t('inactive')}
        </span>
      </div>
      {active ? null : (
        <button type="button" className={styles.pay} onClick={openPricingPopup}>
          {t('pay')}
        </button>
      )}
      {soon ? (
        <button type="button" className={styles.renew} onClick={openPricingPopup}>
          {t('renew')}
        </button>
      ) : null}
      <button type="button" className={styles.all} onClick={openPricingPopup}>
        {t('pricing')}
      </button>
    </section>
  );
}
