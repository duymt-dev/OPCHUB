'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { fetchPendingFundraisings, searchFeeMembers } from '../api';

/** Ô tìm thành viên của hộp Khớp tay: debounce 300 ms, tối đa 10 gợi ý */
const DEBOUNCE_MS = 300;

function useDebounced(value: string, ms: number): string {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export function useMemberLookup(term: string) {
  const q = useDebounced(term.trim(), DEBOUNCE_MS);
  return useQuery({
    queryKey: ['admin-fees', 'member-lookup', q],
    queryFn: () => searchFeeMembers(q),
    enabled: q.length >= 2,
    staleTime: 30_000,
  });
}

/** `matchedHint` khớp đúng 1 thành viên (đúng Mã TV) → điền sẵn */
export function useHintMember(hint: string | null) {
  return useQuery({
    queryKey: ['admin-fees', 'member-lookup', 'hint', hint],
    queryFn: () => searchFeeMembers(hint ?? ''),
    enabled: !!hint,
    select: (p) => {
      const exact = p.items.filter((r) => r.memberCode === hint);
      return exact.length === 1 ? (exact[0] ?? null) : null;
    },
  });
}

/**
 * D-113 (F3): khoản Gói Gọi vốn chờ thanh toán cho hộp Khớp tay — gõ mã GV / tên dự án / Mã TV
 * (debounce 300 ms); ô trống = 20 khoản mới nhất. `hint` (mã GV đọc được) dùng làm từ khoá ban đầu.
 */
export function usePendingFundraisings(term: string) {
  const q = useDebounced(term.trim(), DEBOUNCE_MS);
  return useQuery({
    queryKey: ['admin-fees', 'pending-fundraisings', q],
    queryFn: () => fetchPendingFundraisings(q),
    staleTime: 30_000,
  });
}
