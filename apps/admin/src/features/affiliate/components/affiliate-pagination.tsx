'use client';

import { Pagination } from '@opchub/ui';

interface Paging {
  page: number;
  size: number;
}

/** Shared URL-driven pager for all four Affiliate lists, including read-only mode. */
export function AffiliatePagination({
  total,
  params,
  update,
}: {
  total: number;
  params: Paging;
  update: (patch: Partial<Paging>) => void;
}) {
  return (
    <div data-ro-ok>
      <Pagination
        total={total}
        page={params.page}
        size={params.size}
        sizeOptions={[10, 20, 50, 100]}
        onChange={(page) => update({ page })}
        onSizeChange={(size) => update({ size, page: 1 })}
      />
    </div>
  );
}
