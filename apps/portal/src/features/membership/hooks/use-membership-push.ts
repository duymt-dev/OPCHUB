'use client';

import type { MyMembership } from '@opchub/shared/api-domains';
import { serverEvents } from '@opchub/shared/socket';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { getSocket, realtimeEnabled } from '@/lib/socket';
import { membershipKeys } from '../api';
import { isActive } from '../model';
import { usePaywallStore } from '../store';

/**
 * BUG-025 (SRS §14.4): server đẩy `membership.updated {status, validUntil}` vào `user:{id}` khi
 * webhook khớp → cập nhật cache `/me/membership` + phiên; `useTransferConfirm` thấy hạn mới → toast
 * + đóng hộp. Không polling khi có socket. MSW không có socket: `useMembership` giữ poll dự phòng.
 */
export function useMembershipPush(): void {
  const qc = useQueryClient();
  useEffect(() => {
    if (!realtimeEnabled) return undefined;
    const s = getSocket();
    let dropped = false;
    const onUpdated = (raw: unknown) => {
      const parsed = serverEvents['membership.updated'].safeParse(raw);
      if (!parsed.success) return;
      const { status, validUntil } = parsed.data;
      qc.setQueryData<MyMembership>(membershipKeys.mine, (old) =>
        old ? { ...old, status, validUntil } : old,
      );
      const { me, accessToken, setSession } = useAuthStore.getState();
      const fee = me?.membershipFee;
      const wasLimited = !isActive(fee?.status);
      if (me && accessToken && fee) {
        setSession(accessToken, { ...me, membershipFee: { ...fee, status, validUntil } });
      }
      // V2Q-92: kết nối đang ở chế độ chờ phí → nối lại để server cấp quyền chat đầy đủ
      if (wasLimited && isActive(status)) s.disconnect().connect();
    };
    const onDisconnect = () => {
      dropped = true;
    };
    const onConnect = () => {
      // Mất kết nối trong lúc chờ đối soát → có thể lỡ sự kiện: hỏi lại một lần
      if (dropped && usePaywallStore.getState().waiting) {
        void qc.invalidateQueries({ queryKey: membershipKeys.mine });
      }
      dropped = false;
    };
    s.on('membership.updated', onUpdated);
    s.on('disconnect', onDisconnect);
    s.on('connect', onConnect);
    return () => {
      s.off('membership.updated', onUpdated);
      s.off('disconnect', onDisconnect);
      s.off('connect', onConnect);
    };
  }, [qc]);
}
