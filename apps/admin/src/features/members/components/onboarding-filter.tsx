'use client';

import { useTranslations } from 'next-intl';
import { MEMBER_ONB_FILTERS, type MemberOnbFilter } from '../types';
import styles from './onboarding-filter.module.css';

interface Props {
  value: MemberOnbFilter;
  onChange: (v: MemberOnbFilter) => void;
}

const isFilter = (v: string): v is MemberOnbFilter =>
  (MEMBER_ONB_FILTERS as readonly string[]).includes(v);

/**
 * Thanh lọc (prototype `mFilters`): chỉ select "Khởi đầu" của V4-611 — các select khác của prototype
 * (Nhóm, Vai trò, Phí, Trạng thái, Hồ sơ, Ngày đăng ký) ngoài phạm vi (TIP SKIP, ghi DV).
 */
export function OnboardingFilter({ value, onChange }: Props) {
  const t = useTranslations('members.onboarding');
  return (
    <div className={styles.bar}>
      <label className={styles.field}>
        {t('filter')}
        <select
          className={styles.select}
          data-on={value === 'all' ? '0' : '1'}
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (isFilter(v)) onChange(v);
          }}
        >
          {MEMBER_ONB_FILTERS.map((k) => (
            <option key={k} value={k}>
              {t(`opt.${k}`)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
