'use client';

import { useTranslations } from 'next-intl';
import { formatVnd, PLAN_PRICE, planDiscountPct } from '../model';
import { Check, PlanBadge, TileIcon } from './plan-icons';
import styles from './plan-perks.module.css';

/** Hộp giá D-58: 50.000đ/tháng, "Ưu đãi 75%", 600.000đ/năm, giá niêm yết gạch ngang + 6 quyền lợi */
export function PlanPrice({ amount }: { amount: number }) {
  const t = useTranslations('membership.plan');
  const benefits = t.raw('benefits') as string[];
  return (
    <div className={styles.price}>
      <div className={styles.priceMain}>
        <span className={styles.badge}>
          <PlanBadge />
        </span>
        <div className={styles.tierRow}>
          <span className={styles.tier}>{t('tier')}</span>
          <span className={styles.discount}>{t('discount', { pct: planDiscountPct() })}</span>
        </div>
        <div className={styles.amount}>
          <b>{formatVnd(PLAN_PRICE.monthly)}</b>
          <span>{t('perMonth')}</span>
        </div>
        <div className={styles.yearly}>
          <span>{t('yearly', { amount: formatVnd(amount) })}</span>
          <span className={styles.list}>
            <s>{t('listPrice', { amount: formatVnd(PLAN_PRICE.listMonthly) })}</s>
            <span>{t('listNote')}</span>
          </span>
        </div>
      </div>
      <div className={styles.benefits}>
        {benefits.map((b) => (
          <div key={b} className={styles.benefit}>
            <Check />
            <span>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 5 ô tính năng dưới hộp giá */
export function PlanTiles() {
  const t = useTranslations('membership.plan');
  const tiles = t.raw('tiles') as [string, string][];
  return (
    <div className={styles.tiles}>
      {tiles.map(([name, desc], i) => (
        <div key={name} className={styles.tile}>
          <span className={styles.tileIcon}>
            <TileIcon i={i} />
          </span>
          <b>{name}</b>
          <span>{desc}</span>
        </div>
      ))}
    </div>
  );
}
