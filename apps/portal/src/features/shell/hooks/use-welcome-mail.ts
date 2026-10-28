'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchWelcomeMail, shellKeys } from '../api';

/**
 * P-05: mail chào mừng chưa xem (server trả một lần sau kích hoạt). FX-03 (§29): popup gắn với tài khoản —
 * đăng nhập / đổi tài khoản thì popup của phiên trước tự đóng (khoá query + trạng thái đóng theo người).
 */
export function useWelcomeMail(userId: string | undefined) {
  const [closedFor, setClosedFor] = useState<string | null>(null);
  const q = useQuery({
    queryKey: shellKeys.welcome(userId ?? ''),
    queryFn: fetchWelcomeMail,
    enabled: !!userId,
    staleTime: Infinity,
    retry: false,
  });
  return {
    mail: !userId || closedFor === userId ? null : (q.data ?? null),
    close: () => setClosedFor(userId ?? null),
  };
}
