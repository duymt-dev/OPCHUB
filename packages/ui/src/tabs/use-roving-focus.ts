import type { KeyboardEvent } from 'react';
import { useRef } from 'react';

/**
 * Điều hướng phím mũi tên/Home/End giữa các nút trong một nhóm (WAI-ARIA tabs, radiogroup).
 * Trả về ref setter theo chỉ số và handler keydown cho container.
 */
export function useRovingFocus(count: number, onMove: (index: number) => void) {
  const refs = useRef<(HTMLElement | null)[]>([]);

  const setRef = (index: number) => (el: HTMLElement | null) => {
    refs.current[index] = el;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const current = refs.current.findIndex((el) => el === event.target);
    if (current < 0 || count === 0) return;
    let next = current;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % count;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      next = (current - 1 + count) % count;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = count - 1;
    else return;
    event.preventDefault();
    refs.current[next]?.focus();
    onMove(next);
  };

  return { setRef, onKeyDown };
}
