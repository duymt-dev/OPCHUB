'use client';

import type { ReactNode, SyntheticEvent } from 'react';
import styles from './group-card.module.css';
import { COVER_DEFAULT_SRC } from './group-media';

export interface GroupCoverProps {
  src: string;
  /** Ảnh thay thế khi ảnh chính lỗi — mặc định ảnh bìa tự host (D-36) */
  fallbackSrc?: string;
  /** Chiều cao vùng ảnh: thẻ 160px, popup tham gia 150px */
  size?: 'card' | 'modal';
  children?: ReactNode;
}

/** Ảnh bìa nhóm + lớp phủ navy 30%; nội dung con đặt tuyệt đối trên ảnh */
export function GroupCover({
  src,
  fallbackSrc = COVER_DEFAULT_SRC,
  size = 'card',
  children,
}: GroupCoverProps) {
  const onError = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!img.src.endsWith(fallbackSrc)) img.src = fallbackSrc;
  };
  return (
    <div className={`${styles.cover} ${size === 'modal' ? styles.coverModal : ''}`}>
      <img className={styles.coverImg} src={src} alt="" onError={onError} />
      <div className={styles.shade} />
      {children}
    </div>
  );
}

/** Dãy ≤ 4 ảnh đại diện chồng nhau (24px, viền trắng 2px); không có ảnh → không vẽ */
export function AvatarStack({ srcs }: { srcs: string[] }) {
  if (!srcs.length) return null;
  return (
    <div className={styles.stack} aria-hidden="true">
      {srcs.map((s, i) => (
        <img key={`${s}-${i}`} className={styles.stackImg} src={s} alt="" />
      ))}
    </div>
  );
}
