'use client';

import { useTranslations } from 'next-intl';
import styles from './fundraising.module.css';

export interface PickableProject {
  id: string;
  name: string;
  /** Không có khoản chờ thẩm định / đang gọi vốn (prototype `mineOpts`) */
  canBuy: boolean;
}

/** Chế độ chọn dự án (mở từ Bảng giá): select "Dự án gọi vốn" hoặc gợi ý đăng dự án mới */
export function ProjectPick({
  options,
  value,
  onChange,
  onNew,
}: {
  options: readonly PickableProject[];
  value: string | null;
  onChange: (id: string) => void;
  onNew: () => void;
}) {
  const t = useTranslations('projects.fundPlan');
  if (!options.length) {
    return (
      <div className={styles.noMine}>
        {t('noMine')}
        <button type="button" className={styles.newBtn} onClick={onNew}>
          {t('newProject')}
        </button>
      </div>
    );
  }
  return (
    <label className={styles.pick}>
      {t('pick')}
      <select
        className={styles.select}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}
