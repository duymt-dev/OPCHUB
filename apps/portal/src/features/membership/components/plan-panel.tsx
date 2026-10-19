'use client';

import { useTranslations } from 'next-intl';
import { useMembership } from '../hooks/use-membership';
import { formatDate, formatVnd, isActive } from '../model';
import { PlanHero } from './plan-hero';
import { PromiseIcon } from './plan-icons';
import { PlanPrice, PlanTiles } from './plan-perks';
import styles from './plan-panel.module.css';

/** D-41 / D-58: 600.000đ/năm — dùng khi chưa tải xong phí của tôi */
const FEE = 600_000;
const br = () => <br />;
const PROMISES = ['promise0', 'promise1', 'promise2'] as const;

/**
 * Cột trái popup Gói dịch vụ V4 (UP-07 §23.5): Thành viên hệ thống + "Đăng ký thành viên ngay"
 * mở hộp chuyển khoản (LK-09). TV đã đóng phí thấy dòng "✓ Thành viên đến …".
 */
export function PlanPanel({ onJoin }: { onJoin: () => void }) {
  const t = useTranslations('membership.plan');
  const { data, status } = useMembership();
  const amount = data?.amount ?? FEE;

  return (
    <div className={styles.plan}>
      <PlanHero />
      <PlanPrice amount={amount} />
      <PlanTiles />
      {isActive(status) && data ? (
        <div className={styles.active}>
          {t.rich('activeUntil', { date: formatDate(data.validUntil), b: (c) => <b>{c}</b> })}
        </div>
      ) : null}
      <button type="button" className={styles.join} onClick={onJoin}>
        {t('join', { amount: formatVnd(amount) })}
      </button>
      <div className={styles.promises}>
        {PROMISES.map((k, i) => (
          <span key={k} className={styles.promise}>
            <PromiseIcon i={i} />
            <span>{t.rich(k, { br })}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
