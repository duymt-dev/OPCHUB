'use client';

import { isFeeExempt } from '@opchub/shared';
import { useToast } from '@opchub/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { realtimeEnabled } from '@/lib/socket';
import { confirmTransfer, fetchMembership, membershipKeys } from '../api';
import { formatDate, formatVnd, isMandatory } from '../model';
import { usePaywallStore } from '../store';

/** Dự phòng khi không có socket (MSW): hỏi lại mỗi giây CHỈ trong lúc chờ đối soát */
const POLL_MS = 1000;
/** Kiểm lại mốc hết hạn ở client (không gọi API) — D-57 */
const EXPIRY_TICK_MS = 60_000;

/** Đồng hồ phút để popup bắt buộc hiện ngay khi tab mở qua mốc `validUntil` */
function useMinuteClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), EXPIRY_TICK_MS);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * Phí thành viên của tôi. Có socket: kích hoạt về qua `membership.updated` (useMembershipPush),
 * không polling (BUG-025). MSW: poll 1 s trong lúc chờ webhook giả (D-31).
 */
export function useMembership() {
  const me = useAuthStore((s) => s.me);
  const waiting = usePaywallStore((s) => s.waiting);
  const now = useMinuteClock();
  const q = useQuery({
    queryKey: membershipKeys.mine,
    queryFn: fetchMembership,
    enabled: !!me,
    retry: false,
    refetchInterval: !realtimeEnabled && waiting ? POLL_MS : false,
  });
  const status = q.data?.status ?? me?.membershipFee?.status;
  const validUntil = q.data?.validUntil ?? me?.membershipFee?.validUntil ?? null;
  const exempt = status ? isFeeExempt(status) : false;
  return { data: q.data, status, exempt, now, mandatory: isMandatory(status, validUntil, now) };
}

/**
 * "Tôi đã chuyển khoản": ghi nhận rồi chờ webhook ngân hàng (D-31). Khi hạn mới về:
 * toast + đóng hộp + cập nhật phiên (popup bắt buộc tự đóng).
 */
export function useTransferConfirm(onActivated: () => void) {
  const t = useTranslations('membership.toast');
  const toast = useToast();
  const { data, exempt } = useMembership();
  const { waiting, waitFrom, startWait, endWait } = usePaywallStore();

  const m = useMutation({
    mutationFn: confirmTransfer,
    onMutate: () => startWait(data?.validUntil ?? null),
    onError: (e) => {
      endWait();
      toast(e instanceof ApiError ? e.message : t('failed'));
    },
  });

  useEffect(() => {
    if (exempt && waiting) endWait();
  }, [exempt, waiting, endWait]);

  const renewed = !exempt && waiting && !!data?.validUntil && data.validUntil !== waitFrom;
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
      if (!exempt && !waiting) m.mutate();
    },
  };
}
