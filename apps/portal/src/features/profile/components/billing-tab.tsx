'use client';

import { monthlyOf, planAmountOf } from '@opchub/shared';
import { useTranslations } from 'next-intl';
import { usePrices } from '@/lib/use-prices';
import { formatDate, formatVnd, openPricingPopup } from '@/features/membership';
import type { BillingRow } from '../billing';
import { useBilling } from '../hooks/use-billing';
import styles from './billing.module.css';
import { Tag, type TagTone } from './tag';

type FundStatus = Extract<BillingRow, { kind: 'fund' }>['status'];
const FUND_TONE: Record<FundStatus, TagTone> = {
  pending_payment: 'amber',
  pending_review: 'amber',
  active: 'green',
  expired: 'red',
  rejected: 'red',
};

/** Tab "Gói & thanh toán" (D-89, prototype `prPay`): gói thành viên + lịch sử thanh toán */
export function BillingTab() {
  const t = useTranslations('profile.pay');
  const b = useBilling();
  const plan = b.plan ?? 'personal';
  const prices = usePrices();
  const year = prices ? planAmountOf(prices, plan) : null;
  const pkg = t(plan === 'business' ? 'pkgBusiness' : 'pkgPersonal');
  const what = (r: BillingRow) =>
    r.kind === 'fee'
      ? `${pkg} · ${t('months')}`
      : [
          t('pkgFundraising'),
          r.projectName,
          ...(r.endsAt ? [t('fundUntil', { date: formatDate(r.endsAt) })] : []),
        ].join(' · ');

  return (
    <>
      <div className={styles.section}>
        <span className={styles.title}>{t('plan')}</span>
        <div className={styles.plan}>
          <div className={styles.planText}>
            <div className={styles.planHead}>
              <b>{pkg}</b>
              <Tag tone={b.active ? 'green' : 'amber'}>
                {t(b.exempt ? 'regionalDirector' : b.active ? 'active' : 'inactive')}
              </Tag>
            </div>
            <span className={styles.planSub}>
              {b.exempt ? (
                t('duringTenure')
              ) : (
                <>
                  {year === null
                    ? null
                    : `${t('price', { monthly: formatVnd(monthlyOf(year)), amount: formatVnd(year) })} · `}
                  {b.active ? t('until', { date: formatDate(b.validUntil) }) : t('payToActivate')}
                </>
              )}
            </span>
          </div>
          {!b.active ? (
            <button type="button" className={styles.pay} onClick={openPricingPopup}>
              {t('pay')}
            </button>
          ) : null}
        </div>
      </div>
      <div className={styles.section}>
        <span className={styles.title}>{t('history')}</span>
        <div className={styles.table}>
          {b.rows.map((r) => (
            <div key={`${r.kind}-${r.id}`} className={styles.row}>
              <span className={styles.date}>{formatDate(r.at)}</span>
              <div className={styles.what}>
                <span className={styles.whatName}>{what(r)}</span>
                <span className={styles.ref}>
                  {/* §28.1 (D-105): Gọi vốn = tham chiếu phí (OPCHUB Mã TV) + mã GV */}
                  {r.kind === 'fee' ? b.feeRef : `${b.feeRef} ${r.code}`.trim()}
                </span>
              </div>
              <div className={styles.amount}>
                <b>{formatVnd(r.amount)}</b>
                {r.kind === 'fee' ? (
                  <Tag tone="green">{t('paid')}</Tag>
                ) : (
                  <Tag tone={FUND_TONE[r.status]}>{t(`st_${r.status}`)}</Tag>
                )}
              </div>
            </div>
          ))}
          {b.ready && !b.rows.length ? <div className={styles.empty}>{t('noRows')}</div> : null}
        </div>
      </div>
    </>
  );
}
