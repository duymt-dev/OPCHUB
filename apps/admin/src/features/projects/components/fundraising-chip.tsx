'use client';

import type { AdminProject } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import styles from './fundraising-chip.module.css';

/** Prototype v4 `FS` (Admin › Dự án): nhãn khoản Gọi vốn gần nhất — legacy / hết hạn không hiện */
const TONE = {
  pending_payment: styles.pay,
  pending_review: styles.review,
  active: styles.live,
  rejected: styles.rejected,
} as const;

/**
 * V4-610 (AD-06): chip "Gọi vốn · …" + "Duyệt gọi vốn" / "Từ chối" khi chờ duyệt. `small` = thẻ
 * dạng lưới (24px), mặc định = bảng (30px) như prototype.
 */
export function FundraisingChip({
  p,
  small,
  onDecide,
}: {
  p: AdminProject;
  small?: boolean;
  onDecide: (p: AdminProject, decision: 'approve' | 'reject') => void;
}) {
  const t = useTranslations('projects.fund');
  const f = p.fundraising;
  if (!f || f.status === 'expired') return null;
  const sz = small ? styles.sm : '';
  return (
    <>
      <span className={`${styles.chip} ${TONE[f.status]} ${sz}`}>{t(`status.${f.status}`)}</span>
      {f.status === 'pending_review' ? (
        <>
          <button
            type="button"
            className={`${styles.ok} ${sz}`}
            onClick={() => onDecide(p, 'approve')}
          >
            {t('approve')}
          </button>
          <button
            type="button"
            className={`${styles.no} ${sz}`}
            onClick={() => onDecide(p, 'reject')}
          >
            {t('reject')}
          </button>
        </>
      ) : null}
    </>
  );
}
