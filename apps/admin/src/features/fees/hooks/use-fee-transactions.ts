'use client';

import type { UnmatchedTxn } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api-client';
import { messageOf } from '@/lib/api-errors';
import { feeKeys, fetchUnmatched, matchTransaction, searchFeeMembers } from '../api';
import { txnBadge, vnDate } from '../model';
import { TXN_BADGE_SIZE } from '../types';

/** BUG-014: hàng "Cần đối soát" — keyset "Tải thêm" (`before` = `receivedAt` cuối) */
export function useFeeTransactions() {
  const q = useInfiniteQuery({
    queryKey: feeKeys.unmatched,
    queryFn: ({ pageParam }) => fetchUnmatched(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextBefore,
  });
  const rows = q.data?.pages.flatMap((p) => p.items) ?? [];
  return { q, rows };
}

/** Số trên nút toolbar: hỏi 1 trang `cap + 1` dòng → "9+" nếu còn nhiều hơn */
export function useUnmatchedBadge(): string | null {
  const q = useQuery({
    queryKey: [...feeKeys.unmatched, 'badge'],
    queryFn: () => fetchUnmatched(null, TXN_BADGE_SIZE + 1),
  });
  return q.data ? txnBadge(q.data.items.length, TXN_BADGE_SIZE) : null;
}

export interface MatchInput {
  txn: UnmatchedTxn;
  member: { userId: string; fullName: string; memberCode: string };
  reason: string;
}

/**
 * Khớp tay → 204: toast tên + hạn mới (đọc lại dòng phí của TV), làm mới mọi query phí.
 * 409 (đã có người xử lý) → toast thông điệp server + tải lại danh sách.
 */
export function useMatchTransaction(onDone: () => void) {
  const t = useTranslations('fees.txn.toast');
  const toast = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ txn, member, reason }: MatchInput) => {
      await matchTransaction(txn.id, { userId: member.userId, reason });
      const page = await searchFeeMembers(member.memberCode, 1).catch(() => null);
      const row = page?.items.find((r) => r.userId === member.userId);
      return row?.validUntil ?? null;
    },
    onSuccess: (validUntil, { member }) => {
      toast(t('matched', { name: member.fullName, date: vnDate(validUntil) }));
      onDone();
      void qc.invalidateQueries({ queryKey: feeKeys.all });
    },
    onError: (e) => {
      toast(messageOf(e, t('failed')));
      if (e instanceof ApiError && e.status === 409) {
        onDone();
        void qc.invalidateQueries({ queryKey: feeKeys.unmatched });
      }
    },
  });
}
