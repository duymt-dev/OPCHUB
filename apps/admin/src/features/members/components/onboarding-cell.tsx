'use client';

import type { AdminMember } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { missingLabels, onboardingColor, onboardingPct } from '../onboarding-model';
import styles from './onboarding-cell.module.css';

interface Props {
  m: AdminMember;
  canRemind: boolean;
  onRemind: (m: AdminMember) => void;
}

/**
 * AD-02 cột "Khởi đầu" (V4-611): "x/8" + "Nhắc" / "Đã nhắc" (khi chưa đủ, cần `members.action`),
 * thanh 4px, tooltip "Còn thiếu: …" / "Đã hoàn tất 8 bước khởi đầu".
 */
export function OnboardingCell({ m, canRemind, onRemind }: Props) {
  const t = useTranslations('members.onboarding');
  const o = m.onboarding;
  const all = o.missing.length === 0;
  const tip = all ? t('allDone') : t('missing', { list: missingLabels(o.missing) });
  return (
    <div className={styles.cell} title={tip} data-onb={m.id}>
      <div className={styles.top}>
        <span className={styles.count}>{t('count', { done: o.done, total: 8 })}</span>
        {!all && canRemind ? (
          <button
            type="button"
            className={styles.remind}
            aria-label={t('remindLabel', { name: m.fullName })}
            onClick={(e) => {
              e.stopPropagation();
              onRemind(m);
            }}
          >
            {o.reminded ? t('reminded') : t('remind')}
          </button>
        ) : null}
      </div>
      <div className={styles.bar} aria-hidden>
        <div
          className={styles.fill}
          style={{ width: onboardingPct(o), background: onboardingColor(o) }}
        />
      </div>
    </div>
  );
}
