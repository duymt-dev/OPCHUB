'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fetchCatalog,
  fetchRequestComments,
  fetchRequests,
  fetchRequestSummary,
  fetchStaff,
  requestKeys,
} from '../api';
import type { RequestParams } from '../types';

/** Danh sách phiếu (phân trang server) + thống kê theo trạng thái + số dịch vụ (tab) */
export function useRequests(params: RequestParams) {
  const list = useQuery({
    queryKey: requestKeys.list(params),
    queryFn: () => fetchRequests(params),
    placeholderData: keepPreviousData,
  });
  const summary = useQuery({ queryKey: requestKeys.summary, queryFn: fetchRequestSummary });
  const catalog = useCatalog();
  return { list, summary, catalog };
}

export const useCatalog = () => useQuery({ queryKey: requestKeys.catalog, queryFn: fetchCatalog });

export const useStaff = () =>
  useQuery({ queryKey: requestKeys.staff, queryFn: fetchStaff, staleTime: Infinity });

export function useRequestComments(code: string) {
  return useQuery({
    queryKey: requestKeys.comments(code),
    queryFn: () => fetchRequestComments(code),
  });
}
