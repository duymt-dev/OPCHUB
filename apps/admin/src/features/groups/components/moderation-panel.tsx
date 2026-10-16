'use client';

import type { Report } from '@opchub/shared/api-domains';
import { tones, useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { avatarColorOf } from '../model';
import { useOpenReports, useReportAction } from '../hooks/use-moderation';
import { REPORT_FILTERS, type ReportFilter } from '../types';
import type { ConfirmRequest } from './confirm-dialog';
import { KeywordPanel } from './keyword-panel';
import styles from './moderation.module.css';

const CAT_TONE: Record<Report['reason'], keyof typeof tones> = {
  scam: 'rose',
  spam: 'amber',
  personal_info: 'violet',
  abuse: 'rose',
  other: 'blue',
};

/** Hai chữ đầu của hai từ cuối tên ("Ngô Thành Đạt" → "TĐ") */
const initials = (name: string) =>
  name
    .split(' ')
    .slice(-2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();

function timeLabel(iso: string, yesterday: string) {
  const d = new Date(iso);
  const today = new Date();
  const vn = (x: Date) => x.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  if (vn(d) !== vn(today)) return yesterday;
  return d.toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface CardProps {
  r: Report;
  onAction: (r: Report, action: 'dismiss' | 'hide' | 'warn' | 'lock') => void;
}

function ReportCard({ r, onAction }: CardProps) {
  const t = useTranslations('groups.mod');
  const tone = tones[CAT_TONE[r.reason]];
  const i = r.body.indexOf(r.hit);
  const pre = i < 0 ? r.body : r.body.slice(0, i);
  const post = i < 0 ? '' : r.body.slice(i + r.hit.length);
  const auto = r.source === 'auto';
  return (
    <article className={styles.report}>
      <div className={styles.who}>
        {/* Màu ảnh đại diện chữ / nhãn danh mục là dữ liệu động */}
        <span className={styles.av} style={{ background: avatarColorOf(r.senderName) }}>
          {initials(r.senderName)}
        </span>
        <div className={styles.whoText}>
          <span className={styles.name}>{r.senderName}</span>
          <span className={styles.meta}>
            {r.groupName} · {timeLabel(r.createdAt, t('yesterday'))}
          </span>
        </div>
        <span className={styles.cat} style={{ background: tone.bg, color: tone.fg }}>
          {t(`cat.${r.reason}`)}
        </span>
      </div>
      <div className={styles.text}>
        {pre}
        {i >= 0 ? <mark className={styles.hit}>{r.hit}</mark> : null}
        {post}
      </div>
      <div className={styles.src}>
        <span className={`${styles.srcDot} ${auto ? styles.dotAuto : styles.dotReport}`} />
        {auto ? t('srcAuto') : t('srcReport', { count: r.reporterCount })}
      </div>
      <div className={styles.acts}>
        <button type="button" className={styles.hide} onClick={() => onAction(r, 'hide')}>
          {t('hide')}
        </button>
        <button type="button" className={styles.act} onClick={() => onAction(r, 'warn')}>
          {t('warn')}
        </button>
        <button type="button" className={styles.act} onClick={() => onAction(r, 'lock')}>
          {t('lock')}
        </button>
        <button type="button" className={styles.dismiss} onClick={() => onAction(r, 'dismiss')}>
          {t('dismiss')}
        </button>
      </div>
    </article>
  );
}

interface Props {
  filter: ReportFilter;
  onFilter: (f: ReportFilter) => void;
  onConfirm: (req: ConfirmRequest | null) => void;
}

/** D-33 → D-35: tab "Kiểm duyệt tin nhắn" — báo cáo chờ xử lý + bộ lọc từ khóa */
export function ModerationPanel({ filter, onFilter, onConfirm }: Props) {
  const t = useTranslations('groups.mod');
  const tc = useTranslations('groups.confirm');
  const tt = useTranslations('groups.toast');
  const toast = useToast();
  const reports = useOpenReports().data ?? [];
  const act = useReportAction();
  const shown = reports.filter((r) => filter === 'all' || r.source === filter);

  const run = (r: Report, action: 'dismiss' | 'hide' | 'warn' | 'lock') =>
    act.mutate(
      { r, action },
      {
        onSuccess: () => {
          onConfirm(null);
          if (action === 'hide') toast(tt('hidden'));
          if (action === 'warn') toast(tt('warned', { name: r.senderName }));
          if (action === 'lock') toast(tt('locked', { name: r.senderName }));
        },
      },
    );
  // Ẩn & xóa là thao tác phá huỷ → xác nhận (D-32); các nút khác làm ngay như prototype
  const onAction = (r: Report, action: 'dismiss' | 'hide' | 'warn' | 'lock') =>
    action === 'hide'
      ? onConfirm({
          title: tc('hideTitle'),
          body: tc('hideBody', { name: r.senderName }),
          okLabel: tc('hide'),
          onOk: () => run(r, 'hide'),
        })
      : run(r, action);

  return (
    <div className={styles.card}>
      <div className={styles.main}>
        <div className={styles.top}>
          <div className={styles.titles}>
            <div className={styles.title}>{t('title')}</div>
            <div className={styles.sub}>{t('sub')}</div>
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
            <ReportCard key={r.id} r={r} onAction={onAction} />
          ))}
        </div>
        {reports.length === 0 ? <div className={styles.empty}>{t('empty')}</div> : null}
      </div>
      <KeywordPanel />
    </div>
  );
}
