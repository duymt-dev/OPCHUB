'use client';

import type { Report } from '@opchub/shared/api-domains';
import { tones } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { avatarColorOf } from '../model';
import styles from './moderation.module.css';

const CAT_TONE: Record<Report['reason'], keyof typeof tones> = {
  scam: 'rose',
  spam: 'amber',
  personal_info: 'violet',
  abuse: 'rose',
  other: 'blue',
};

/** Chữ viết tắt như `ini` của prototype: chữ đầu từ đầu + từ cuối ("Ngô Thành Đạt" → "NĐ") */
const initials = (name: string) => {
  const w = name.trim().split(/\s+/);
  const first = w[0] ?? '?';
  return (
    w.length > 1 ? `${first[0]}${w[w.length - 1]?.[0] ?? ''}` : first.slice(0, 2)
  ).toUpperCase();
};

function timeLabel(iso: string, yesterday: string) {
  const d = new Date(iso);
  const vn = (x: Date) => x.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  if (vn(d) !== vn(new Date())) return yesterday;
  return d.toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  r: Report;
  /** "Thời gian khóa" hiện hành */
  days: number;
  onRestore: (r: Report) => void;
  onLock: (r: Report) => void;
}

/**
 * Thẻ tin bị ẩn (prototype v4 2829–2845): nhãn "Đã ẩn tự động", "Vi phạm lần n" / "Đã khóa N
 * ngày", nút "Khóa N ngày" (khi chưa khoá) và "Khôi phục tin".
 */
export function ReportCard({ r, days, onRestore, onLock }: Props) {
  const t = useTranslations('groups.mod');
  const tone = tones[CAT_TONE[r.reason]];
  const i = r.body.indexOf(r.hit);
  const pre = i < 0 ? r.body : r.body.slice(0, i);
  const post = i < 0 ? '' : r.body.slice(i + r.hit.length);
  const auto = r.source === 'auto';
  const severe = r.senderLocked || r.violations > 1;
  return (
    <article className={styles.report} data-report={r.id}>
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
        <span className={styles.badge}>{t('autoHidden')}</span>
        <span className={`${styles.badge} ${severe ? styles.badgeRed : styles.badgeAmber}`}>
          {r.senderLocked
            ? t('lockedDays', { days })
            : t('violation', { count: Math.max(1, r.violations) })}
        </span>
        {r.canLock ? (
          <button type="button" className={styles.lock} onClick={() => onLock(r)}>
            {t('lockDays', { days })}
          </button>
        ) : null}
        <button
          type="button"
          className={styles.restore}
          title={t('restoreTitle')}
          onClick={() => onRestore(r)}
        >
          {t('restore')}
        </button>
      </div>
    </article>
  );
}
