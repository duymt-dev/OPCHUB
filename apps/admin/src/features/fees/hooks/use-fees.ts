'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { feeKeys, fetchFees, fetchFeeSummary } from '../api';
import type { FeeParams } from '../types';

/** Danh sách phí (phân trang server) + thống kê / số trên tab */
export function useFees(params: FeeParams) {
  const list = useQuery({
    queryKey: feeKeys.list(params),
    queryFn: () => fetchFees(params),
    placeholderData: keepPreviousData,
  });
  const summary = useQuery({ queryKey: feeKeys.summary, queryFn: fetchFeeSummary });
  return { list, summary };
}
