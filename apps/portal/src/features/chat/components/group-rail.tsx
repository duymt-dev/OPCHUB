'use client';

import { useTranslations } from 'next-intl';
import { shortGroupName } from '../format';
import type { ChatGroup } from '../types';
import styles from './group-rail.module.css';

interface Props {
  joined: ChatGroup[];
  others: ChatGroup[];
  activeId: string | null;
  previewId: string | null;
  onOpen: (g: ChatGroup) => void;
  onPreview: (g: ChatGroup) => void;
  onJoinMore: () => void;
}

interface TileProps {
  g: ChatGroup;
  label: string;
  active: boolean;
  badge: string | null;
  other?: boolean;
  onClick: () => void;
}

function Tile({ g, label, active, badge, other, onClick }: TileProps) {
  return (
    <button
      type="button"
      title={g.name}
      aria-current={active}
      className={`${styles.tile} ${other ? styles.other : ''}`}
      onClick={onClick}
    >
      <span className={styles.thumb}>
        <span className={styles.img}>
          {/* eslint-disable-next-line @next/next/no-img-element -- D-36: ảnh mẫu, tự host sau */}
          <img src={g.thumbUrl} alt="" />
        </span>
        {badge ? <span className={styles.badge}>{badge}</span> : null}
      </span>
      <span className={styles.name}>{label}</span>
    </button>
  );
}

/** Cột trái: NHÓM đã tham gia + NHÓM KHÁC (xem trước) + "Tham gia thêm nhóm" */
export function GroupRail(p: Props) {
  const t = useTranslations('chat.rail');
  return (
    <nav className={styles.rail} data-m="chrail" aria-label={t('joined')}>
      <div className={styles.label}>{t('joined')}</div>
      {p.joined.map((g) => {
        const active = g.id === p.activeId && !p.previewId;
        // nhóm đang mở không hiện số chưa đọc nhưng vẫn hiện số yêu cầu chờ duyệt (chủ nhóm)
        const n = (active ? 0 : g.unread) || g.pendingRequests;
        return (
          <Tile
            key={g.id}
            g={g}
            label={shortGroupName(g.name)}
            active={active}
            badge={n > 0 ? String(n) : null}
            onClick={() => p.onOpen(g)}
          />
        );
      })}
      <div className={styles.divider} />
      <div className={styles.label}>
        {t('others')}
        <br />
        {t('othersCount', { n: p.others.length })}
      </div>
      {p.others.map((g) => (
        <Tile
          key={g.id}
          g={g}
          other
          label={g.province}
          active={g.id === p.previewId}
          badge={g.myStatus === 'pending' ? t('pendingBadge') : null}
          onClick={() => p.onPreview(g)}
        />
      ))}
      <div className={styles.dividerSm} />
      <button
        type="button"
        title={t('joinMore')}
        aria-label={t('joinMore')}
        className={styles.more}
        onClick={p.onJoinMore}
      >
        +
      </button>
    </nav>
  );
}
