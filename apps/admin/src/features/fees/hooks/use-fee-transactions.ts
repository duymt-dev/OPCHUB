'use client';

import type { PendingFundraising, UnmatchedTxn } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
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

export type MatchInput =
  | {
      kind: 'fee';
      txn: UnmatchedTxn;
      member: { userId: string; fullName: string; memberCode: string };
      reason: string;
    }
  | { kind: 'fundraising'; txn: UnmatchedTxn; fundraising: PendingFundraising; reason: string };

/**
 * Khớp tay → 204: phí → toast tên + hạn mới (đọc lại dòng phí của TV); Gọi vốn (D-113 F3) → toast mã GV
 * "chờ thẩm định". Làm mới mọi query phí. 409 (đã có người xử lý) → toast thông điệp server + tải lại.
 */
export function useMatchTransaction(onDone: () => void) {
  const locale = useLocale();
  const t = useTranslations('fees.txn.toast');
  const toast = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MatchInput) => {
      if (input.kind === 'fundraising') {
        const { txn, fundraising, reason } = input;
        await matchTransaction(txn.id, {
          kind: 'fundraising',
          fundraisingId: fundraising.id,
          reason,
        });
        return null;
      }
      const { txn, member, reason } = input;
      await matchTransaction(txn.id, { userId: member.userId, reason });
      const page = await searchFeeMembers(member.memberCode, 1).catch(() => null);
      const row = page?.items.find((r) => r.userId === member.userId);
      return row?.validUntil ?? null;
    },
    onSuccess: (validUntil, input) => {
      toast(
        input.kind === 'fundraising'
          ? t('matchedFundraising', { code: input.fundraising.code })
          : t('matched', { name: input.member.fullName, date: vnDate(validUntil, locale) }),
      );
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
