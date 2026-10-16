'use client';

import { useCallback, useState } from 'react';

/** Chọn theo id, giữ qua các trang/tab như prototype (feSel); "chọn tất cả" chỉ áp cho trang đang xem */
export function useFeeSelection(pageIds: string[]) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const clear = useCallback(() => setSelected(new Set()), []);
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (!n.delete(id)) n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSelected((s) => {
      const n = new Set(s);
      const all = pageIds.length > 0 && pageIds.every((id) => n.has(id));
      pageIds.forEach((id) => (all ? n.delete(id) : n.add(id)));
      return n;
    });
  return { selected, ids: [...selected], toggle, toggleAll, clear };
}
