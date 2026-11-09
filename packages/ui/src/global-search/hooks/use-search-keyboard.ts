import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { GlobalSearchProps } from '../types';

/** Escape also clears when focus has moved from the input to a result button. */
export function useSearchKeyboard(
  open: boolean,
  clear: () => void,
  groups: GlobalSearchProps['groups'],
) {
  const [selection, setSelection] = useState({ groups, index: -1 });
  // A response replaces the group array: discard selection synchronously, before Enter can fire.
  const index = selection.groups === groups ? selection.index : -1;
  const rows = groups.flatMap((group) => group.items.map((item) => ({ kind: group.kind, item })));
  const select = (next: number) => setSelection({ groups, index: next });
  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      select(-1);
      clear();
      return;
    }
    if (!open || !rows.length || event.nativeEvent.isComposing) return;
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const next =
      event.key === 'ArrowDown'
        ? (index + 1) % rows.length
        : index <= 0
          ? rows.length - 1
          : index - 1;
    select(next);
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') clear();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, clear]);
  return { index, select, onKeyDown, selected: rows[index < 0 ? 0 : index] };
}
