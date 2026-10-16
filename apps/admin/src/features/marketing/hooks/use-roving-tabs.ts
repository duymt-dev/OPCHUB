'use client';

import { useRef, type KeyboardEvent } from 'react';

/** Điều hướng tab bằng mũi tên trái/phải, Home/End (WAI-ARIA tabs) */
export function useRovingTabs<K extends string>(keys: readonly K[], onSelect: (k: K) => void) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const setRef = (i: number) => (el: HTMLButtonElement | null) => {
    refs.current[i] = el;
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const cur = refs.current.indexOf(e.currentTarget);
    const n = keys.length;
    const next =
      e.key === 'ArrowRight'
        ? (cur + 1) % n
        : e.key === 'ArrowLeft'
          ? (cur - 1 + n) % n
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? n - 1
              : -1;
    const k = keys[next];
    if (next < 0 || !k) return;
    e.preventDefault();
    refs.current[next]?.focus();
    onSelect(k);
  };
  return { setRef, onKeyDown };
}
