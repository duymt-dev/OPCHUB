'use client';

import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { EventView } from '../types';
import styles from './event-meet.module.css';

const VIDEO = 'M4 6h10a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2zM16 10l6-3v10l-6-3z';

/**
 * EV-R01 / AT-EV01: người đã đăng ký thấy link Google Meet (Sao chép, Vào phòng họp); chưa đăng ký
 * chỉ thấy ghi chú — server không trả `meetUrl` cho người chưa đăng ký.
 */
export function EventMeet({ e }: { e: Pick<EventView, 'meetUrl' | 'registeredByMe'> }) {
  const t = useTranslations('events.meet');
  const toast = useToast();
  const url = e.registeredByMe ? e.meetUrl : null;
  if (!url) {
    return e.registeredByMe ? null : <div className={styles.note}>{t('note')}</div>;
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // clipboard có thể bị chặn — vẫn báo như prototype
    }
    toast(t('copied'));
  };
  return (
    <div className={styles.box}>
      <div className={styles.head}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1677FF"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={VIDEO} />
        </svg>
        <b>{t('title')}</b>
      </div>
      <div className={styles.link}>
        <a href={url} target="_blank" rel="noopener noreferrer">
          {url.replace(/^https?:\/\//, '')}
        </a>
        <button type="button" onClick={() => void copy()}>
          {t('copy')}
        </button>
      </div>
      <button
        type="button"
        className={styles.join}
        onClick={() => window.open(url, '_blank', 'noopener')}
      >
        {t('join')}
      </button>
    </div>
  );
}
