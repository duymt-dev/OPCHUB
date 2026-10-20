'use client';

import { Pagination } from '@opchub/ui';
import type { AffiliatePaginationProps } from '../types';

/** Shared URL-driven pager for all four Affiliate lists, including read-only mode. */
export function AffiliatePagination({
  total,
  params,
  update,
  unit,
  sizes = [10, 20, 50, 100],
}: AffiliatePaginationProps) {
  return (
    <div data-ro-ok>
      <Pagination
        total={total}
        page={params.page}
        size={params.size}
        sizeOptions={sizes}
        {...(unit ? { labels: { unit } } : {})}
        onChange={(page) => update({ page })}
        onSizeChange={(size) => update({ size, page: 1 })}
      />
    </div>
  );
}
