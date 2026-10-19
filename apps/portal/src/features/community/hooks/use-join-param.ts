'use client';

import { useEffect, useRef } from 'react';
import type { CommunityGroup } from '../types';

interface Args {
  /** `?join=<id>` trên URL */
  join: string | undefined;
  groups: CommunityGroup[] | undefined;
  /** Nhóm đang mở form tham gia (null = đóng) */
  joining: CommunityGroup | null;
  open: (g: CommunityGroup) => void;
  /** Xoá `join` khỏi URL (idempotent) */
  clear: () => void;
}

/**
 * BUG-026 / QT-05: `/community?join=<id>` — khi danh sách nhóm đã tải, mở form tham gia nhóm đó
 * MỘT lần cho mỗi giá trị `join`; form đóng (huỷ hoặc gửi xong) → bỏ `join` khỏi URL. Nhóm không
 * tồn tại / đã tham gia / đang chờ duyệt → bỏ `join`, không lỗi. Theo dõi theo giá trị `join` (không
 * theo cờ mount) vì Next giữ state trang khi quay lại.
 */
export function useJoinParam({ join, groups, joining, open, clear }: Args) {
  /** `join` đã xử lý + form của nó đã thật sự mở chưa */
  const handled = useRef<{ id: string; shown: boolean } | null>(null);
  useEffect(() => {
    if (!join) {
      handled.current = null;
      return;
    }
    if (!groups || handled.current?.id === join) return;
    const g = groups.find((x) => x.id === join);
    if (g && !g.joined && !g.pending) {
      handled.current = { id: join, shown: false };
      open(g);
    } else {
      handled.current = { id: join, shown: true };
      // Đến bằng router.push: Next ghi history SAU effect của trang → hoãn để không bị ghi đè
      window.setTimeout(clear, 0);
    }
  }, [join, groups, open, clear]);
  useEffect(() => {
    const h = handled.current;
    if (!h) return;
    if (joining) {
      h.shown = true;
      return;
    }
    if (h.shown) window.setTimeout(clear, 0);
  }, [joining, clear]);
}
