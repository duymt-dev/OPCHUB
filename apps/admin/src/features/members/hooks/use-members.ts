'use client';

import type { AdminMemberPage } from '@opchub/shared/api-domains';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { fetchAllGroups, fetchMembers, memberKeys, type AdminMember } from '../api';
import { groupLookup } from '../model';
import type { MembersParams } from '../types';

export function useMembers(p: MembersParams) {
  const key = { type: p.type, q: p.q, page: p.page, size: p.size };
  return useQuery({
    queryKey: memberKeys.list(key),
    queryFn: () => fetchMembers(key),
    placeholderData: keepPreviousData,
  });
}

export function useGroupLookup() {
  const q = useQuery({ queryKey: memberKeys.groups, queryFn: fetchAllGroups, staleTime: 300_000 });
  return useMemo(() => groupLookup(q.data?.items ?? []), [q.data]);
}

/**
 * Sửa thành viên trong mọi trang đã cache (cập nhật lạc quan) — ảnh parity chụp ngay sau thao tác
 * nên trạng thái phải đổi trước khi request trả về. Trả hàm hoàn tác khi lỗi.
 */
export function usePatchMembers() {
  const qc = useQueryClient();
  return useCallback(
    (ids: string[], patch: (m: AdminMember) => AdminMember) => {
      const snapshot = qc.getQueriesData<AdminMemberPage>({ queryKey: memberKeys.all });
      qc.setQueriesData<AdminMemberPage>({ queryKey: [...memberKeys.all, 'list'] }, (old) =>
        old ? { ...old, items: old.items.map((m) => (ids.includes(m.id) ? patch(m) : m)) } : old,
      );
      return () => snapshot.forEach(([k, v]) => qc.setQueryData(k, v));
    },
    [qc],
  );
}
