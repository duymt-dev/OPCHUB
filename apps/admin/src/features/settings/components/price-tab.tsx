'use client';

import { fundCommissionOf } from '@opchub/shared';
import { useTranslations } from 'next-intl';
import { usePriceConfig } from '../hooks/use-price-config';
import { vnd } from '../model';
import { PriceInput, PricePlanCard } from './price-plan-card';
import styles from './price.module.css';

/** Prototype: "Hoa hồng Affiliate 10% trên Gói Gọi vốn" — % cố định BR-GV-06 (D-70) */
const FUND_AFF_RATE = 10;

/** Cài đặt › Cấu hình bảng giá (D-94 5A, prototype `stPrice`) */
export function PriceTab() {
  const t = useTranslations('settings.price');
  const tc = useTranslations('settings.common');
  const p = usePriceConfig();
  const f = p.form;
  if (!f) return <div className={styles.box}>{tc('loading')}</div>;
  return (
    <div className={styles.box}>
      <div className={styles.top}>
        <div className={styles.title}>
          <span className={styles.h16}>{t('heading')}</span>
          <span className={styles.sub}>{t('headingSub')}</span>
        </div>
        <div className={styles.actions}>
          {p.dirty ? (
            <button type="button" className={styles.ghost} onClick={p.reset}>
              {t('reset')}
            </button>
          ) : null}
          <button type="button" className={styles.primary} onClick={p.save}>
            {t('save')}
          </button>
        </div>
      </div>
      <div className={styles.plans}>
        {(['per', 'biz'] as const).map((g) => (
          <PricePlanCard
            key={g}
            g={g}
            list={f[g].list}
            y={f[g].y}
            onSet={(k, v) => p.set(g, k, v)}
          />
        ))}
      </div>
      <div className={styles.fund}>
        <div className={styles.planHead}>
          <b className={styles.planName}>{t('fund.name')}</b>
          <span className={styles.aud}>{t('fund.aud')}</span>
        </div>
        <div className={styles.fields}>
          <PriceInput
            label={t('fund.price')}
            value={f.fund.p}
            onChange={(v) => p.set('fund', 'p', v)}
          />
          <PriceInput
            label={t('fund.renew')}
            value={f.fund.r}
            onChange={(v) => p.set('fund', 'r', v)}
          />
          <PriceInput
            label={t('fund.months')}
            value={f.fund.mo}
            onChange={(v) => p.set('fund', 'mo', v)}
          />
        </div>
        <span className={styles.aff}>
          {t.rich('fund.aff', {
            rate: FUND_AFF_RATE,
            amount: vnd(fundCommissionOf(f.fund.p, FUND_AFF_RATE)),
            b: (c) => <b>{c}</b>,
          })}
        </span>
      </div>
    </div>
  );
}
