'use client';

import { useEffect } from 'react';

/** Esc đóng hộp tự vẽ (dialog, drawer, menu) khi `active` */
export function useEscape(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onEscape]);
}
