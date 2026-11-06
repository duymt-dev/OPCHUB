import { useEffect } from 'react';

/** Escape also clears when focus has moved from the input to a result button. */
export function useSearchKeyboard(open: boolean, clear: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') clear();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, clear]);
}
