'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { usePageVisible } from '@/lib/use-page-visible';
import { fetchNavBadges, shellKeys } from '../api';
import type { AdminNavKey } from '../nav';

/**
 * Badge sidebar lấy từ API đếm. Mọi thao tác ghi thành công ở bất kỳ màn nào đều có thể đổi
 * số chờ → nghe mutation cache và tải lại (khung không import nội bộ feature khác).
 */
export function useNavBadges(): Partial<Record<AdminNavKey, number>> {
  const qc = useQueryClient();
  // NA-24: số đỏ sidebar làm mới 3 giây khi tab hiện (tab ẩn dừng)
  const visible = usePageVisible();
  const q = useQuery({
    queryKey: shellKeys.badges,
    queryFn: fetchNavBadges,
    refetchInterval: visible ? 3_000 : false,
    refetchIntervalInBackground: false,
  });

  useEffect(
    () =>
      qc.getMutationCache().subscribe((e) => {
        if (e.type === 'updated' && e.action.type === 'success') {
          void qc.invalidateQueries({ queryKey: shellKeys.badges });
        }
      }),
    [qc],
  );

  return q.data ?? {};
}
