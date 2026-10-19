'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

/**
 * Trạng thái mở/đóng của popover tự vẽ (không dùng motion của antd — đồng hồ dừng khi chụp parity).
 * Bấm ra ngoài phần tử `root` hoặc Esc thì đóng. Ref do component tạo (luật react-hooks/refs).
 */
export function usePopover(
  root: RefObject<HTMLElement | null>,
  onChange?: (open: boolean) => void,
) {
  const [open, setRaw] = useState(false);
  // Báo mở/đóng ngay tại thao tác (không qua effect) — NA-10 chuông "mở = đã đọc"
  const changed = useRef(onChange);
  useEffect(() => {
    changed.current = onChange;
  });
  const setOpen = useCallback((next: (v: boolean) => boolean) => {
    setRaw((v) => {
      const n = next(v);
      if (n !== v) queueMicrotask(() => changed.current?.(n));
      return n;
    });
  }, []);
  const close = useCallback(() => setOpen(() => false), [setOpen]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, root, close]);

  return {
    open,
    toggle: () => setOpen((v) => !v),
    close,
  };
}
