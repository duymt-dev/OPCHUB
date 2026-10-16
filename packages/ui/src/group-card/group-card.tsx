'use client';

import type { ReactNode } from 'react';
import styles from './group-card.module.css';
import { AvatarStack, GroupCover } from './group-cover';

export interface GroupCardProps {
  name: string;
  description: string;
  coverSrc: string;
  coverFallbackSrc?: string;
  /** Nhãn khu vực góc trái ảnh, màu chữ theo tông nhóm */
  tag: string;
  tagColor: string;
  /** "Công khai" / "Cần duyệt" */
  privacy: string;
  avatars: string[];
  membersLabel: string;
  onlineLabel: string;
  weeklyLabel: string;
  /** Hàng nút cuối thẻ (Vào phòng chat / Rời nhóm / Đăng ký tham gia…) */
  actions: ReactNode;
}

/** Thẻ cộng đồng (commList của prototype): ảnh bìa 160px, tên, mô tả, online, nút */
export function GroupCard(p: GroupCardProps) {
  return (
    <article className={styles.card}>
      <GroupCover
        src={p.coverSrc}
        {...(p.coverFallbackSrc ? { fallbackSrc: p.coverFallbackSrc } : {})}
      >
        {/* Màu nhãn là dữ liệu tông nhóm (động), không phải token giao diện */}
        <span className={styles.tag} style={{ color: p.tagColor }}>
          {p.tag}
        </span>
        <span className={styles.privacy}>{p.privacy}</span>
        <div className={styles.members}>
          <AvatarStack srcs={p.avatars} />
          <span>{p.membersLabel}</span>
        </div>
      </GroupCover>
      <div className={styles.body}>
        <div className={styles.name}>{p.name}</div>
        <div className={styles.desc}>{p.description}</div>
        <div className={styles.meta}>
          <span className={styles.online}>
            <i className={styles.dot} aria-hidden="true" />
            {p.onlineLabel}
          </span>
          <span>{p.weeklyLabel}</span>
        </div>
        <div className={styles.actions}>{p.actions}</div>
      </div>
    </article>
  );
}
