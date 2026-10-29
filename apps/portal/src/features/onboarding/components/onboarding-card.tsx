'use client';

import type { Onboarding } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { usePrices } from '@/lib/use-prices';
import { formatVnd } from '@/features/membership';
import { useStepActions } from '../hooks/use-step-actions';
import { progressPct, stepRows } from '../model';
import { CheckIcon, FundIcon } from './icons';
import styles from './onboarding.module.css';
import { StepRow } from './step-row';

/** Thẻ tuỳ chọn "Gói Gọi vốn cho dự án" (Cá nhân có dự án, ngoài 8 bước — D-85) */
function FundraisingRow({ done, onOpen }: { done: boolean; onOpen: () => void }) {
  const t = useTranslations('onboarding.fundraising');
  const fund = usePrices()?.fund;
  return (
    <div className={styles.opt} data-step="fundraising" data-state={done ? 'done' : 'todo'}>
      <span className={styles.circle} aria-hidden>
        <FundIcon />
      </span>
      <div className={styles.text}>
        <span className={styles.stepTitle}>{t('title')}</span>
        <span className={styles.desc}>
          {fund ? t('desc', { amount: formatVnd(fund.p), months: fund.mo }) : null}
        </span>
      </div>
      {done ? (
        <span className={styles.doneTag}>{t('done')}</span>
      ) : (
        <button type="button" className={styles.cta} onClick={onOpen}>
          {t('cta')}
        </button>
      )}
    </div>
  );
}

/** UP-04 "Hướng dẫn bắt đầu": tiến độ x/8, thanh 8px, 8 bước, tuỳ chọn Gọi vốn */
export function OnboardingCard({ o }: { o: Onboarding }) {
  const t = useTranslations('onboarding.card');
  const act = useStepActions();
  const pct = progressPct(o);
  const all = o.done === o.total;
  return (
    <section className={styles.card} data-onb="card" aria-labelledby="onb-title">
      <div className={styles.head}>
        <div className={styles.titleRow}>
          <h3 id="onb-title" className={styles.title}>
            {t('title')}
          </h3>
          <span className={styles.progress} data-onb="progress">
            {t('progress', { done: o.done, total: o.total, pct })}
          </span>
        </div>
        <div
          className={styles.bar}
          role="progressbar"
          aria-label={t('title')}
          aria-valuemin={0}
          aria-valuemax={o.total}
          aria-valuenow={o.done}
        >
          <div className={styles.fill} style={{ width: `${pct}%` }} />
        </div>
        {all ? (
          <div className={styles.allDone} role="status">
            <CheckIcon size={18} stroke="#52C41A" width={2.6} />
            {t('allDone')}
          </div>
        ) : null}
      </div>
      <ol className={styles.list}>
        {stepRows(o).map((r) => (
          <StepRow
            key={r.key}
            row={r}
            business={o.accountType === 'business'}
            onGo={act.go}
            onPay={act.pay}
          />
        ))}
      </ol>
      {o.fundraising ? <FundraisingRow done={o.fundraising.done} onOpen={act.fundraising} /> : null}
    </section>
  );
}
