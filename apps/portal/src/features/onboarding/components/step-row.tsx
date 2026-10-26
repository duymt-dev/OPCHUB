'use client';

import type { OnboardingKey } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import type { StepRow as Row } from '../model';
import { CheckIcon } from './icons';
import styles from './onboarding.module.css';

/** Khoá i18n của bước: "Hồ sơ" khác nhau giữa DN và Cá nhân */
const textKey = (key: OnboardingKey, business: boolean) =>
  key === 'prof' ? (business ? 'profBiz' : 'profPer') : key;

interface Props {
  row: Row;
  business: boolean;
  onGo: (key: OnboardingKey) => void;
  onPay: () => void;
}

/** Một bước: vòng tròn 36px (xong / kế tiếp / chưa), tiêu đề + mô tả, CTA hoặc "Đã hoàn thành" */
export function StepRow({ row, business, onGo, onPay }: Props) {
  const t = useTranslations('onboarding');
  const k = textKey(row.key, business);
  const locked = row.state === 'locked';
  const desc = t(`steps.${k}.desc`);
  return (
    <li className={styles.row} data-step={row.key} data-state={row.state}>
      <span className={styles.circle} aria-hidden>
        {row.state === 'done' ? <CheckIcon size={16} stroke="currentColor" width={3} /> : row.n}
      </span>
      <div className={styles.text}>
        <span className={styles.stepTitle}>{t(`steps.${k}.title`)}</span>
        <span className={styles.desc}>{locked ? t('card.lockedDesc', { desc }) : desc}</span>
      </div>
      {row.state === 'done' ? (
        <span className={styles.doneTag}>{t('card.done')}</span>
      ) : (
        <button
          type="button"
          className={styles.cta}
          data-primary={row.state === 'next' ? '1' : '0'}
          onClick={() => (locked ? onPay() : onGo(row.key))}
        >
          {locked ? t('card.locked') : t(`steps.${k}.cta`)}
        </button>
      )}
    </li>
  );
}
