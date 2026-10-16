'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchWelcomeMail, shellKeys } from '../api';

/** P-05: mail chào mừng chưa xem (server trả một lần sau kích hoạt) */
export function useWelcomeMail() {
  const [closed, setClosed] = useState(false);
  const q = useQuery({
    queryKey: shellKeys.welcome,
    queryFn: fetchWelcomeMail,
    staleTime: Infinity,
    retry: false,
  });
  return {
    mail: closed ? null : (q.data ?? null),
    close: () => setClosed(true),
  };
}
