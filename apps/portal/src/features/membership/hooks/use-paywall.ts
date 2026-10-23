'use client';

import type { ServiceRequest } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';
import { logout } from '@/features/auth';
import { useAuthStore } from '@/lib/auth-store';
import { PAYWALL_PATHS, viewOfPath, type PaywallView } from '../model';
import { pushPath } from '../navigation';
import { requiresPaymentOverlay } from '../overlay-policy';
import { usePaywallStore } from '../store';
import { useMembership } from './use-membership';

/**
 * Điều phối hộp Gói dịch vụ: bước lấy từ URL; TK chưa đóng phí luôn thấy hộp (BR-03, D-28),
 * đóng hộp chỉ báo nhắc. Đóng thường → về trang đang xem trước khi mở hộp.
 */
export function usePaywall() {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const tAuth = useTranslations('auth');
  const t = useTranslations('membership.popup');
  const { mandatory } = useMembership();
  const store = usePaywallStore();
  const lastPage = useRef('/dashboard');

  const route = viewOfPath(pathname);
  useEffect(() => {
    if (!route) lastPage.current = `${pathname}${window.location.search}`;
  }, [route, pathname]);

  const overlayRequired = requiresPaymentOverlay(mandatory, pathname);
  let view: PaywallView | null = route?.view ?? (overlayRequired ? 'list' : null);
  // Tải lại ở `/services/requests/:code` không còn phiếu trong bộ nhớ → về danh sách
  if (view === 'done' && !store.request) view = 'list';

  const { setRequest, endWait, setPayFromList, reset, payFromList, setPopup } = store;
  const close = useCallback(() => {
    setRequest(null);
    endWait();
    setPopup(false);
    pushPath(mandatory ? PAYWALL_PATHS.list : lastPage.current);
  }, [mandatory, setRequest, endWait, setPopup]);

  return {
    view,
    mandatory: overlayRequired,
    /**
     * Prototype v4 `data-pg="1"`: Bảng giá / form tư vấn nằm trong khung nội dung; chuyển khoản mở từ
     * trang Bảng giá thì trang vẫn nằm sau hộp chuyển khoản (`pTab` giữ 'services')
     */
    asPage:
      !!view &&
      !overlayRequired &&
      !store.popup &&
      (view !== 'pay' || (payFromList && pathname === PAYWALL_PATHS.pay)),
    svcId: route?.svcId ?? null,
    request: store.request,
    toList: () => {
      setRequest(null);
      pushPath(PAYWALL_PATHS.list);
    },
    toForm: (svcId: string) => pushPath(PAYWALL_PATHS.form(svcId)),
    toDone: (r: ServiceRequest) => {
      setRequest(r);
      pushPath(PAYWALL_PATHS.done(r.code));
    },
    toPay: (fromList: boolean) => {
      setPayFromList(fromList);
      pushPath(PAYWALL_PATHS.pay);
    },
    backFromPay: () => {
      endWait();
      // Prototype `payBack`: quay lại từ chuyển khoản → Bảng giá dạng hộp nổi (`svPop:true`)
      setPopup(true);
      pushPath(
        payFromList || requiresPaymentOverlay(mandatory, lastPage.current)
          ? PAYWALL_PATHS.list
          : lastPage.current,
      );
    },
    close,
    blocked: () => toast(t('blocked')),
    logout: () => {
      void logout().catch(() => undefined);
      reset();
      qc.clear();
      useAuthStore.getState().clear();
      toast(tAuth('login.loggedOut'));
      router.replace('/login');
    },
  };
}
