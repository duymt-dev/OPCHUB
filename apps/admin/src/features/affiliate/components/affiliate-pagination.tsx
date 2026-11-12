'use client';

import { Pagination } from '@opchub/ui';
import type { AffiliatePaginationProps } from '../types';
import { useAdminUiLabels } from '@/i18n/ui-labels';

/** Shared URL-driven pager for all four Affiliate lists, including read-only mode. */
export function AffiliatePagination({
  total,
  params,
  update,
  unit,
  sizes = [10, 20, 50, 100],
}: AffiliatePaginationProps) {
  const ui = useAdminUiLabels();
  return (
    <div data-ro-ok>
      <Pagination
        total={total}
        page={params.page}
        size={params.size}
        sizeOptions={sizes}
        labels={{ ...ui.pagination, ...(unit ? { unit } : {}) }}
        onChange={(page) => update({ page })}
        onSizeChange={(size) => update({ size, page: 1 })}
      />
    </div>
  );
}
