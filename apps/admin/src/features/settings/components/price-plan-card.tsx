'use client';

import { discountPctOf, monthlyAboveList, monthlyOf } from '@opchub/shared';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { vnd } from '../model';
import styles from './price.module.css';

/** Ô số của prototype (`inputmode="numeric"`, nhãn trên, gợi ý dưới) */
export function PriceInput({
  label,
  value,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  hint?: ReactNode;
  onChange: (v: string) => void;
}) {
  return (
    <label className={styles.field}>
      {label}
      <input
        className={styles.input}
        inputMode="numeric"
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </label>
  );
}

/** Thẻ gói năm (prototype `prcV.per` / `prcV.biz`): niêm yết / tháng, bán / năm, xem trước + cảnh báo */
export function PricePlanCard({
  g,
  list,
  y,
  onSet,
}: {
  g: 'per' | 'biz';
  list: number;
  y: number;
  onSet: (k: 'list' | 'y', v: string) => void;
}) {
  const locale = useLocale();
  const t = useTranslations('settings.price');
  return (
    <div className={styles.plan} data-plan={g}>
      <div className={styles.planHead}>
        <b className={styles.planName}>{t(`${g}.name`)}</b>
        <span className={styles.aud}>{t(`${g}.aud`)}</span>
      </div>
      <div className={styles.fields}>
        <PriceInput
          label={t('list')}
          value={list}
          hint={t('listHint', { amount: vnd(list * 12, locale) })}
          onChange={(v) => onSet('list', v)}
        />
        <PriceInput
          label={t('year')}
          value={y}
          hint={t('yearHint')}
          onChange={(v) => onSet('y', v)}
        />
      </div>
      <div className={styles.preview}>
        <span className={styles.previewLabel}>{t('preview')}</span>
        <b className={styles.previewPrice}>
          {t('perMonth', { amount: vnd(monthlyOf(y), locale) })}
        </b>
        <span className={styles.off}>{t('off', { pct: discountPctOf(list, y) })}</span>
      </div>
      {monthlyAboveList(list, y) ? <span className={styles.warn}>{t('warn')}</span> : null}
    </div>
  );
}
