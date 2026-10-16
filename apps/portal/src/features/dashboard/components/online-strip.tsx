'use client';

import type { LiveMember } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { fmtNumber } from '../model';
import { STATUS_COLORS } from '../types';
import { Avatar } from './avatar';
import styles from './online-strip.module.css';

interface Props {
  online: number;
  members: LiveMember[];
  onPick: (id: string) => void;
}

/** Dải "Đang trực tuyến" chạy ngang (marquee); bấm một người để chọn trên lưới LIVE */
export function OnlineStrip({ online, members, onPick }: Props) {
  const t = useTranslations('dashboard.online');
  const chip = (m: LiveMember, copy: boolean) => (
    <button
      key={`${copy ? 'c' : 'o'}-${m.id}`}
      type="button"
      className={styles.chip}
      tabIndex={copy ? -1 : 0}
      aria-hidden={copy || undefined}
      onClick={() => onPick(m.id)}
    >
      <span className={styles.face}>
        <Avatar src={m.avatarUrl} size={34} />
        <i className={styles.dot} style={{ background: STATUS_COLORS[m.status].color }} />
      </span>
      <span className={styles.text}>
        <span className={styles.name}>{m.name}</span>
        <span className={styles.meta}>
          {m.title} · {m.countryCode}
        </span>
      </span>
    </button>
  );

  return (
    <section className={styles.strip}>
      <div className={styles.label}>
        <span className={styles.labelTitle}>
          <i className={styles.blink} />
          {t('title')}
        </span>
        <span className={styles.count}>{t('count', { n: fmtNumber(online) })}</span>
      </div>
      <div className={styles.viewport}>
        <div className={styles.track}>
          {members.map((m) => chip(m, false))}
          {members.map((m) => chip(m, true))}
        </div>
      </div>
    </section>
  );
}
