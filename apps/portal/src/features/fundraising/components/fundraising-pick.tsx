'use client';

import { useTranslations } from 'next-intl';
import { ProjectPick, type PickableProject } from './project-pick';
import styles from './fundraising.module.css';

/**
 * Cột (1) popup Gói Gọi vốn v4.2: chọn dự án (chế độ Bảng giá), "Đã chọn N dự án" + số tiền, lưu ý
 * "Không thu phí thành công…". Mở sau khi đăng dự án → chỉ có tổng + lưu ý.
 */
export function FundraisingPick({
  pick,
  options,
  selected,
  amountText,
  feeOf,
  onSelect,
  onNew,
}: {
  pick: boolean;
  options: readonly PickableProject[];
  selected: string | null;
  amountText: string;
  feeOf: (p: PickableProject) => string;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const t = useTranslations('projects.fundPlan');
  return (
    <div className={styles.col}>
      {pick ? (
        <ProjectPick
          options={options}
          value={selected}
          feeOf={feeOf}
          onChange={onSelect}
          onNew={onNew}
        />
      ) : null}
      <div className={styles.total}>
        <span>{t.rich('picked', { n: selected ? 1 : 0, b: (c) => <b>{c}</b> })}</span>
        <b>{selected ? amountText : t('noneSelected')}</b>
      </div>
      <div className={styles.note}>{t('note')}</div>
    </div>
  );
}
