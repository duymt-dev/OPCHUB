'use client';

import { useToast } from '@opchub/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { confirmTransfer, fetchMembership, membershipKeys } from '../api';
import { formatDate, formatVnd, isMandatory } from '../model';
import { usePaywallStore } from '../store';

/** Nhịp hỏi lại trạng thái khi chờ webhook — thay bằng `membership.updated` khi có socket */
const POLL_MS = 1000;

/** Phí thành viên của tôi; khi đang chờ đối soát thì hỏi lại định kỳ (D-31) */
export function useMembership() {
  const me = useAuthStore((s) => s.me);
  const waiting = usePaywallStore((s) => s.waiting);
  const q = useQuery({
    queryKey: membershipKeys.mine,
    queryFn: fetchMembership,
    enabled: !!me,
    retry: false,
    refetchInterval: waiting ? POLL_MS : false,
  });
  const status = q.data?.status ?? me?.membershipFee?.status;
  return { data: q.data, status, mandatory: isMandatory(status) };
}

/**
 * "Tôi đã chuyển khoản": ghi nhận rồi chờ webhook ngân hàng (D-31). Khi hạn mới về:
 * toast + đóng hộp + cập nhật phiên (popup bắt buộc tự đóng).
 */
export function useTransferConfirm(onActivated: () => void) {
  const t = useTranslations('membership.toast');
  const toast = useToast();
  const { data } = useMembership();
  const { waiting, waitFrom, startWait, endWait } = usePaywallStore();

  const m = useMutation({
    mutationFn: confirmTransfer,
    onMutate: () => startWait(data?.validUntil ?? null),
    onError: (e) => {
      endWait();
      toast(e instanceof ApiError ? e.message : t('failed'));
    },
  });

  const renewed = waiting && !!data?.validUntil && data.validUntil !== waitFrom;
  useEffect(() => {
    if (!renewed || !data) return;
    endWait();
    const { me, accessToken, setSession } = useAuthStore.getState();
    if (me && accessToken) {
      setSession(accessToken, {
        ...me,
        membershipFee: {
          status: data.status,
          validUntil: data.validUntil,
          transferRef: data.transferRef,
          amount: data.amount,
        },
      });
    }
    toast(t('activated', { amount: formatVnd(data.amount), date: formatDate(data.validUntil) }));
    onActivated();
  }, [renewed, data, endWait, toast, t, onActivated]);

  return {
    waiting,
    confirm: () => {
      if (!waiting) m.mutate();
    },
  };
}
