'use client';

import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/auth-store';
import { useMembership } from '../hooks/use-membership';
import { formatDate, formatVnd, isActive, shortName } from '../model';
import { usePaywallStore } from '../store';
import { Arrow, Crown, Shield, Tick } from './plan-icons';
import styles from './plan-panel.module.css';

/** D-41: 600.000đ/năm — dùng khi chưa tải xong phí của tôi */
const FEE = 600_000;

function PriceBox({ amount }: { amount: number }) {
  const t = useTranslations('membership.plan');
  return (
    <div className={styles.price}>
      <span className={styles.tier}>{t('tier')}</span>
      <div className={styles.amount}>
        <b>{formatVnd(amount)}</b>
        <span>{t('perYear')}</span>
      </div>
      <span className={styles.monthly}>
        {t('perMonth', { amount: formatVnd(Math.round(amount / 12)) })}
      </span>
    </div>
  );
}

/** Cột trái popup Gói dịch vụ: Thành viên hệ thống 600.000đ/năm (D-41) + "Đăng ký ngay" */
export function PlanPanel({ onJoin }: { onJoin: () => void }) {
  const t = useTranslations('membership.plan');
  const me = useAuthStore((s) => s.me);
  const { data, status } = useMembership();
  const note = usePaywallStore((s) => s.note);
  const setNote = usePaywallStore((s) => s.setNote);
  const amount = data?.amount ?? FEE;
  const benefits = t.raw('benefits') as string[];

  return (
    <div className={styles.plan}>
      <Crown />
      <div className={styles.hello}>
        <span className={styles.hi}>{t('hi', { name: shortName(me?.fullName ?? '') })}</span>
        <span className={styles.lead}>{t('lead')}</span>
      </div>
      <PriceBox amount={amount} />
      <div className={styles.benefits}>
        {benefits.map((b) => (
          <div key={b} className={styles.benefit}>
            <Tick />
            <span>{b}</span>
          </div>
        ))}
      </div>
      {isActive(status) && data ? (
        <div className={styles.active}>
          {t.rich('activeUntil', { date: formatDate(data.validUntil), b: (c) => <b>{c}</b> })}
        </div>
      ) : null}
      <input
        className={styles.note}
        value={note}
        placeholder={t('note')}
        aria-label={t('note')}
        onChange={(e) => setNote(e.target.value)}
      />
      <button type="button" className={styles.join} onClick={onJoin}>
        {t('join', { amount: formatVnd(amount) })}
        <Arrow />
      </button>
      <span className={styles.secure}>
        <Shield />
        {t('secure')}
      </span>
    </div>
  );
}
