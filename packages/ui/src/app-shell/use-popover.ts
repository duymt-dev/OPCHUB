'use client';

import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

/**
 * Trạng thái mở/đóng của popover tự vẽ (không dùng motion của antd — đồng hồ dừng khi chụp parity).
 * Bấm ra ngoài phần tử `root` hoặc Esc thì đóng. Ref do component tạo (luật react-hooks/refs).
 */
export function usePopover(root: RefObject<HTMLElement | null>) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, root]);

  return {
    open,
    toggle: () => setOpen((v) => !v),
    close: () => setOpen(false),
  };
}
