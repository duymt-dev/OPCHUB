'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';

/** Cách đáy ≤ ngưỡng này coi như đang đứng ở cuối danh sách */
const NEAR_PX = 24;
/** Sự kiện `scroll` trong khoảng này sau thao tác của người dùng mới coi là người dùng cuộn */
const GESTURE_MS = 1000;
const GESTURES = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const;

/**
 * Đang ở cuối danh sách tin mà nội dung / khung đổi cỡ (thanh ghim hiện lại, tin thay chỗ khi phòng
 * tải lại, ảnh tải xong) → giữ ở cuối, như prototype luôn thấy tin mới nhất sau khi gửi.
 * Trả về hàm cuộn xuống cuối. Chỉ thao tác của người dùng mới rời "cuối danh sách": trình duyệt tự
 * kẹp `scrollTop` khi nội dung co lại một nhịp (phòng tải lại) cũng phát `scroll`, không tính.
 */
export function useStickToBottom(ref: RefObject<HTMLDivElement | null>): () => void {
  const atBottom = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    // Mở phòng lần đầu đứng ở đầu như prototype; người dùng cuộn tới đáy thì bám đáy
    let gestureAt = 0;
    const gesture = () => {
      gestureAt = Date.now();
    };
    const measure = () => {
      const near = el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_PX;
      if (near && el.scrollTop > 0) atBottom.current = true;
      else if (!near && Date.now() - gestureAt <= GESTURE_MS) atBottom.current = false;
    };
    const stick = () => {
      if (atBottom.current) el.scrollTop = el.scrollHeight;
    };
    const ro = new ResizeObserver(stick);
    ro.observe(el);
    const mo = new MutationObserver(stick);
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    el.addEventListener('scroll', measure, { passive: true });
    for (const g of GESTURES) el.addEventListener(g, gesture, { passive: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
      el.removeEventListener('scroll', measure);
      for (const g of GESTURES) el.removeEventListener(g, gesture);
    };
  }, [ref]);
  return useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    atBottom.current = el.scrollHeight > el.clientHeight;
  }, [ref]);
}
