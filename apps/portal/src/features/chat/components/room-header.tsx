'use client';

import { Icon } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { ChatGroup, ChatRoom } from '../types';
import styles from './room-header.module.css';

interface HeaderProps {
  room: ChatRoom;
  group: ChatGroup;
  panelOpen: boolean;
  searchOpen: boolean;
  onTogglePanel: () => void;
  onToggleSearch: () => void;
}

const PANEL_ICON = 'M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zM15 4v16';

/** "Tạo bởi X · mô tả" cho chủ đề, mô tả trơn cho phòng Chung */
export function useRoomDesc(room: ChatRoom) {
  const t = useTranslations('chat.header');
  return room.createdBy
    ? t('createdBy', { name: room.createdBy, desc: room.description })
    : room.description;
}

export function RoomHeader(p: HeaderProps) {
  const t = useTranslations('chat.header');
  const desc = useRoomDesc(p.room);
  const panelTip = p.panelOpen ? t('panelHide') : t('panelShow');
  return (
    <div className={styles.header}>
      <span className={styles.hash}>#</span>
      <div className={styles.info}>
        <div className={styles.line}>
          <span className={styles.name}>{p.room.name}</span>
          <span className={styles.group}>{t('group', { name: p.group.name })}</span>
        </div>
        <div className={styles.desc}>{desc}</div>
      </div>
      <span className={styles.online}>{t('online', { n: p.room.online })}</span>
      <button
        type="button"
        title={panelTip}
        aria-label={panelTip}
        aria-pressed={p.panelOpen}
        className={styles.icon}
        onClick={p.onTogglePanel}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d={PANEL_ICON} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </button>
      <button
        type="button"
        title={t('search')}
        aria-label={t('search')}
        aria-pressed={p.searchOpen}
        className={styles.icon}
        onClick={p.onToggleSearch}
      >
        <Icon name="search" size={16} />
      </button>
    </div>
  );
}

interface SearchProps {
  q: string;
  hits: number;
  onChange: (q: string) => void;
  onClose: () => void;
}

/** Thanh tìm trong phòng — từ khoá ghi vào URL `?q=` */
export function RoomSearch({ q, hits, onChange, onClose }: SearchProps) {
  const t = useTranslations('chat.header');
  return (
    <div className={styles.search}>
      <input
        // eslint-disable-next-line jsx-a11y/no-autofocus -- mở thanh tìm là để gõ ngay (như prototype)
        autoFocus
        className={styles.searchInput}
        value={q}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('searchPh')}
        aria-label={t('searchPh')}
      />
      <span className={styles.hits}>{q.trim() ? t('hits', { n: hits }) : ''}</span>
      <button type="button" className={styles.close} onClick={onClose}>
        {t('close')}
      </button>
    </div>
  );
}

interface TopProps {
  room: ChatRoom;
  group: ChatGroup;
  hits: number;
  url: {
    q: string;
    searchOpen: boolean;
    panel: unknown;
    setQ: (v: string) => void;
    toggleSearch: () => void;
    setPanel: (t: 'members' | null) => void;
  };
}

/** Header phòng + thanh tìm (nếu mở) — trạng thái lấy từ URL */
export function RoomTop({ room, group, hits, url }: TopProps) {
  return (
    <>
      <RoomHeader
        room={room}
        group={group}
        panelOpen={url.panel !== null}
        searchOpen={url.searchOpen}
        onTogglePanel={() => url.setPanel(url.panel ? null : 'members')}
        onToggleSearch={url.toggleSearch}
      />
      {url.searchOpen ? (
        <RoomSearch q={url.q} hits={hits} onChange={url.setQ} onClose={url.toggleSearch} />
      ) : null}
    </>
  );
}
