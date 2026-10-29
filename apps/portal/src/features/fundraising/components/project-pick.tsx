'use client';

import { useTranslations } from 'next-intl';
import styles from './fundraising.module.css';

export interface PickableProject {
  id: string;
  name: string;
  /** Lĩnh vực (dòng phụ của thẻ — prototype `o.cat`) */
  category: string;
  /** Đã từng gọi vốn và hết hạn → giá gia hạn (D-106) */
  renew: boolean;
  /** BR-GV-01: đã bật gọi vốn, không nháp, không chờ thẩm định / đang gọi vốn (prototype `mine`) */
  canBuy: boolean;
}

/**
 * "1. Chọn dự án" (prototype v4.2 `mineOpts`): thẻ chọn dự án; D-94 4B — **một** dự án / khoản nên chọn
 * một (radio), không có "Chọn / bỏ chọn tất cả". Chưa có dự án → gợi ý đăng dự án mới.
 */
export function ProjectPick({
  options,
  value,
  feeOf,
  onChange,
  onNew,
}: {
  options: readonly PickableProject[];
  value: string | null;
  feeOf: (p: PickableProject) => string;
  onChange: (id: string) => void;
  onNew: () => void;
}) {
  const t = useTranslations('projects.fundPlan');
  return (
    <>
      <span className={styles.step}>{t('stepPick')}</span>
      {options.length ? (
        <div className={styles.opts} role="radiogroup" aria-label={t('pick')}>
          {options.map((o) => {
            const on = o.id === value;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={on}
                className={`${styles.opt} ${on ? styles.optOn : ''}`}
                onClick={() => onChange(o.id)}
              >
                <span className={`${styles.mk} ${on ? styles.mkOn : ''}`} aria-hidden="true">
                  {on ? '✓' : ''}
                </span>
                <span className={styles.optText}>
                  <span className={styles.optName}>{o.name}</span>
                  <span className={styles.optCat}>{o.category}</span>
                </span>
                <span className={styles.optFee}>{feeOf(o)}</span>
              </button>
            );
          })}
          <span className={styles.hint}>{t('pickHint')}</span>
        </div>
      ) : (
        <div className={styles.noMine}>
          {t('noMine')}
          <button type="button" className={styles.newBtn} onClick={onNew}>
            {t('newProject')}
          </button>
        </div>
      )}
    </>
  );
}
