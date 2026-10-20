'use client';

import type { LiveMember } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { STATUS_COLORS } from '../types';
import { Avatar } from './avatar';
import styles from './live-grid.module.css';

interface Props {
  member: LiveMember;
  selected: boolean;
  ago: (at: string) => string;
  onPick: (id: string) => void;
}

/** Một ô thành viên trên lưới LIVE */
export function LiveTile({ member: m, selected, ago, onPick }: Props) {
  const t = useTranslations('dashboard.live');
  const c = STATUS_COLORS[m.status];
  const act =
    m.status === 'chat'
      ? t('actChat', { room: m.roomName })
      : m.status === 'event'
        ? t('actEvent')
        : m.status === 'online'
          ? t('actOnline')
          : t('actOff');

  return (
    <button
      type="button"
      className={styles.tile}
      data-selected={selected}
      data-member={m.id}
      aria-pressed={selected}
      onClick={() => onPick(m.id)}
    >
      <span className={styles.face}>
        <Avatar src={m.avatarUrl} size={52} ring={c.color} />
        <i className={styles.faceDot} style={{ background: c.color }} />
      </span>
      <span className={styles.name}>{m.name}</span>
      <span className={styles.org}>
        {m.org} · {m.countryCode}
      </span>
      <span className={styles.pill} style={{ background: c.bg, color: c.color }}>
        {t(m.status)}
      </span>
      <span className={styles.act}>
        {act}
        <br />
        <span className={styles.ago}>{m.status === 'off' ? '' : ago(m.lastActiveAt)}</span>
      </span>
      <span className={styles.score}>
        <span style={{ width: `${m.scorePct}%` }} />
      </span>
    </button>
  );
}
