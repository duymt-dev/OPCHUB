'use client';

import type { Fundraising } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useResubmitFundraising } from '../hooks/use-resubmit-fundraising';
import styles from './fund-rejected.module.css';

/**
 * D-113 (F6, §27.5b): Gói Gọi vốn bị Admin từ chối — lý do (nếu có), hướng dẫn sửa dự án để bổ sung hồ
 * sơ, nút gửi duyệt lại. Không thu phí lần hai (phí không hoàn lại, giữ khoản đã thu).
 */
export function FundRejected({ fundraising }: { fundraising: Fundraising }) {
  const t = useTranslations('projects.fundRejected');
  const resubmit = useResubmitFundraising();
  return (
    <div className={styles.box} onClick={(e) => e.stopPropagation()} role="presentation">
      <b className={styles.title}>{t('title')}</b>
      {fundraising.reviewNote ? (
        <span>
          {t('reason')}: {fundraising.reviewNote}
        </span>
      ) : null}
      <span className={styles.hint}>{t('hint')}</span>
      <button
        type="button"
        className={styles.btn}
        disabled={resubmit.isPending}
        onClick={() => resubmit.mutate(fundraising.id)}
      >
        {t('resubmit')}
      </button>
    </div>
  );
}
