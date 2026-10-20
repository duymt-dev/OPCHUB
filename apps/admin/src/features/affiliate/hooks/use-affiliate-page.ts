'use client';

import { useEffect } from 'react';

/** Reconcile after cancellation/deletion shrinks the last page; never sum financial data. */
export function useAffiliatePage(
  params: { page: number; size: number },
  data: { total: number } | undefined,
  update: (patch: { page: number }) => void,
) {
  const last = data ? Math.max(1, Math.ceil(data.total / params.size)) : undefined;
  useEffect(() => {
    if (last !== undefined && params.page > last) update({ page: last });
  }, [last, params.page, update]);
}
