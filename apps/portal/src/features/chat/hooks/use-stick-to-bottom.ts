'use client';

import { useEffect, type RefObject } from 'react';

/** Cách đáy ≤ ngưỡng này coi như đang đứng ở cuối danh sách */
const NEAR_PX = 24;

/**
 * Đang ở cuối danh sách tin mà nội dung / khung đổi cỡ (thanh ghim hiện lại, tin thay chỗ khi phòng
 * tải lại, ảnh tải xong) → giữ ở cuối, như prototype luôn thấy tin mới nhất sau khi gửi.
 */
export function useStickToBottom(ref: RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    // Chỉ đo khi danh sách thật sự cuộn (người dùng / tự cuộn tới tin mới): mở phòng lần đầu đứng
    // ở đầu như prototype, nội dung ngắn lúc đang tải không bị coi là "ở cuối"
    let atBottom = false;
    const measure = () => {
      atBottom = el.scrollTop > 0 && el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_PX;
    };
    const stick = () => {
      if (atBottom) el.scrollTop = el.scrollHeight;
    };
    const ro = new ResizeObserver(stick);
    ro.observe(el);
    const mo = new MutationObserver(stick);
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    el.addEventListener('scroll', measure, { passive: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
      el.removeEventListener('scroll', measure);
    };
  }, [ref]);
}
