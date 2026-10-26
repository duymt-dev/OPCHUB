'use client';

import type { ConfirmRequest } from '@opchub/ui';
import type { Report } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useModerationSettings, useOpenReports, useReportAction } from '../hooks/use-moderation';
import { REPORT_FILTERS, type ReportFilter } from '../types';
import { KeywordPanel } from './keyword-panel';
import styles from './moderation.module.css';
import { ReportCard } from './report-card';

interface Props {
  filter: ReportFilter;
  onFilter: (f: ReportFilter) => void;
  /** Giữ chữ ký orchestrator (V4-612 không còn thao tác phá huỷ cần xác nhận ở tab này) */
  onConfirm: (req: ConfirmRequest | null) => void;
}

/**
 * D-33 → D-35 (V4-612, §26.6): tab "Kiểm duyệt tin nhắn" — tin đã ẩn tự động chờ xử lý (Khôi
 * phục tin / Khóa N ngày), quy tắc + thời gian khoá, bộ lọc từ khóa.
 */
export function ModerationPanel({ filter, onFilter }: Props) {
  const t = useTranslations('groups.mod');
  const tt = useTranslations('groups.toast');
  const toast = useToast();
  const reports = useOpenReports().data ?? [];
  const act = useReportAction();
  const { days } = useModerationSettings();
  const shown = reports.filter((r) => filter === 'all' || r.source === filter);

  const restore = (r: Report) =>
    act.mutate(
      { r, action: 'restore' },
      {
        onSuccess: (done) =>
          toast(
            tt(done.senderLocked || !r.senderLocked ? 'restored' : 'restoredUnlocked', {
              name: r.senderName,
            }),
          ),
      },
    );
  const lock = (r: Report) =>
    act.mutate(
      { r, action: 'lock' },
      { onSuccess: () => toast(tt('lockedDays', { name: r.senderName, days })) },
    );

  return (
    <div className={styles.card}>
      <div className={styles.main}>
        <div className={styles.top}>
          <div className={styles.titles}>
            <div className={styles.title}>{t('title')}</div>
            <div className={styles.sub}>{t('sub', { days })}</div>
          </div>
          <div className={styles.right}>
            <span className={styles.pending}>{t('pending', { count: reports.length })}</span>
            <div className={styles.seg} role="radiogroup" aria-label={t('filterLabel')}>
              {REPORT_FILTERS.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={filter === k}
                  className={`${styles.segItem} ${filter === k ? styles.segOn : ''}`}
                  onClick={() => onFilter(k)}
                >
                  {t(`filter.${k}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.grid}>
          {shown.map((r) => (
            <ReportCard key={r.id} r={r} days={days} onRestore={restore} onLock={lock} />
          ))}
        </div>
        {reports.length === 0 ? <div className={styles.empty}>{t('empty')}</div> : null}
      </div>
      <KeywordPanel />
    </div>
  );
}
