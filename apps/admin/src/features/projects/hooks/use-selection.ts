'use client';

import { useState } from 'react';

/** Chọn nhiều dòng; "Chọn tất cả" chỉ trang hiện tại (antd-ui.md / BR-12) */
export function useSelection<T extends { id: string }>(items: T[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const picked = items.filter((p) => selected.has(p.id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSelected(
      picked.length === items.length && items.length ? new Set() : new Set(items.map((p) => p.id)),
    );
  const clear = () => setSelected(new Set());
  return { selected, picked, toggle, toggleAll, clear };
}
