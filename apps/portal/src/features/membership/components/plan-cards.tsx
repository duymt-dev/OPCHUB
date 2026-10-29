'use client';

import { monthlyOf, planPrice, type MembershipPlan, type PriceConfig } from '@opchub/shared';
import { useTranslations } from 'next-intl';
import { formatVnd } from '../model';
import { Check } from './plan-icons';
import styles from './plan-cards.module.css';

interface Props {
  /** Gói của tài khoản (D-68: theo loại TK lúc đăng ký) */
  mine: MembershipPlan;
  /** Phí đang hiệu lực → nút "Gia hạn", thẻ Gọi vốn mở được */
  paid: boolean;
  onJoin: () => void;
  onFundraising: () => void;
  /** D-94 5A: Cấu hình bảng giá (`GET /public/price-config`) */
  prices: PriceConfig;
}

const PLANS: MembershipPlan[] = ['personal', 'business'];

/** Dấu tích: xanh cho gói thành viên, cam cho Gói Gọi vốn (prototype v4.2) */
function Perks({ items, color }: { items: string[]; color?: string }) {
  return (
    <div className={styles.perks}>
      {items.map((x) => (
        <div key={x} className={styles.perk}>
          <Check color={color} />
          <span>{x}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Thẻ gói năm (prototype v4.2 `pk`): miễn phí 3 tháng đầu (D-94 1A) → 0đ / tháng, giá niêm yết gạch,
 * "Từ tháng thứ 4" giá tháng · năm. Gói của mình bấm được, gói còn lại xám "Dành cho tài khoản …"
 */
function PlanCard({
  p,
  own,
  paid,
  onJoin,
  prices,
}: {
  p: MembershipPlan;
  own: boolean;
  paid: boolean;
  onJoin: () => void;
  prices: PriceConfig;
}) {
  const t = useTranslations('membership.plans');
  const price = planPrice(prices, p);
  const year = formatVnd(price.y);
  return (
    <div className={styles.card} data-plan={p} data-mine={own ? '1' : '0'}>
      {p === 'business' ? <span className={styles.popular}>{t('popular')}</span> : null}
      {own ? <span className={styles.mineTag}>{t('mine')}</span> : null}
      <div className={styles.nameRow}>
        <span className={styles.name}>{t(`${p}.name`)}</span>
        <span className={styles.discount}>{t('trialOff')}</span>
      </div>
      <span className={styles.who}>{t(`${p}.who`)}</span>
      <div className={styles.price}>
        <b>{formatVnd(0)}</b>
        <span className={styles.per}>{t('perMonth')}</span>
        <s>{t('list', { amount: formatVnd(price.list) })}</s>
      </div>
      <span className={styles.yearly}>
        {t.rich('from4', {
          month: formatVnd(monthlyOf(price.y)),
          amount: year,
          b: (c) => <b>{c}</b>,
        })}
      </span>
      <div className={styles.line} />
      <Perks items={t.raw(`${p}.perks`) as string[]} />
      <div className={styles.foot}>
        <button
          type="button"
          className={styles.btn}
          data-on={own ? '1' : '0'}
          disabled={!own}
          onClick={onJoin}
        >
          {own
            ? t(paid ? 'renew' : 'join', { amount: year })
            : t('forOther', { type: t(`${p}.type`) })}
        </button>
      </div>
    </div>
  );
}

/** UP-12 §27: Bảng giá 3 thẻ — Cá nhân · Doanh nghiệp (phổ biến) · Gói Gọi vốn (mua thêm) */
export function PlanCards({ mine, paid, onJoin, onFundraising, prices }: Props) {
  const t = useTranslations('membership.plans');
  const fund = prices.fund;
  return (
    <div className={styles.cards}>
      {PLANS.map((p) => (
        <PlanCard key={p} p={p} own={p === mine} paid={paid} onJoin={onJoin} prices={prices} />
      ))}
      <div className={`${styles.card} ${styles.fund}`}>
        <span className={styles.fundTag}>{t('fund.tag')}</span>
        <span className={styles.fundName}>{t('fund.name')}</span>
        <span className={styles.fundWho}>{t('fund.who', { months: fund.mo })}</span>
        <div className={styles.fundPrice}>
          <b>{formatVnd(fund.p)}</b>
          <span>{t('fund.per')}</span>
          <span className={styles.fundPay}>{t('fund.payNow')}</span>
        </div>
        <span className={styles.fundNote}>
          {t('fund.note', {
            amount: formatVnd(fund.r),
            months: fund.mo,
          })}
        </span>
        <div className={styles.fundLine}>
          <Perks items={t.raw('fund.perks') as string[]} color="#FA8C16" />
        </div>
        <div className={styles.foot}>
          <button
            type="button"
            className={styles.fundBtn}
            data-on={paid ? '1' : '0'}
            disabled={!paid}
            onClick={onFundraising}
          >
            {paid ? t('fund.join', { amount: formatVnd(fund.p) }) : t('fund.locked')}
          </button>
        </div>
      </div>
    </div>
  );
}
