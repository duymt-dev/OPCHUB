'use client';

import type { ReactNode, SyntheticEvent } from 'react';
import styles from './group-card.module.css';

export interface GroupCoverProps {
  src: string;
  /** Ảnh thay thế khi ảnh chính lỗi (prototype: picsum theo id nhóm) */
  fallbackSrc?: string;
  /** Chiều cao vùng ảnh: thẻ 160px, popup tham gia 150px */
  size?: 'card' | 'modal';
  children?: ReactNode;
}

/** Ảnh bìa nhóm + lớp phủ navy 30%; nội dung con đặt tuyệt đối trên ảnh */
export function GroupCover({ src, fallbackSrc, size = 'card', children }: GroupCoverProps) {
  const onError = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (fallbackSrc && img.src !== fallbackSrc) img.src = fallbackSrc;
  };
  return (
    <div className={`${styles.cover} ${size === 'modal' ? styles.coverModal : ''}`}>
      <img className={styles.coverImg} src={src} alt="" onError={onError} />
      <div className={styles.shade} />
      {children}
    </div>
  );
}

/** Dãy 4 ảnh đại diện chồng nhau (24px, viền trắng 2px) */
export function AvatarStack({ srcs }: { srcs: string[] }) {
  return (
    <div className={styles.stack} aria-hidden="true">
      {srcs.map((s, i) => (
        <img key={`${s}-${i}`} className={styles.stackImg} src={s} alt="" />
      ))}
    </div>
  );
}
