'use client';

import { useState } from 'react';
import { toggleAll } from '../model';

/** Ô chọn của bảng: một dòng, cả trang hiện tại, bỏ chọn */
export function useSelection() {
  const [sel, setSel] = useState<Set<string>>(new Set());
  return {
    sel,
    toggle: (id: string) =>
      setSel((s) => {
        const n = new Set(s);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      }),
    togglePage: (ids: readonly string[]) => setSel((s) => toggleAll(s, ids)),
    clear: () => setSel(new Set()),
  };
}
