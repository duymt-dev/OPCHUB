import type { ServiceRequest } from '@opchub/shared/api-domains';
import { create } from 'zustand';

/**
 * Bước của hộp Gói dịch vụ lấy từ URL (`/services`, `/services/:svc/request`,
 * `/services/requests/:code`, `/membership/pay` — xem model.viewOfPath). Store chỉ giữ phần
 * không nằm trên URL.
 */
interface PaywallState {
  /** Phiếu vừa gửi — hiện ở `/services/requests/:code` */
  request: ServiceRequest | null;
  /** Mở hộp chuyển khoản từ popup Gói dịch vụ → "Quay lại" trở về popup */
  payFromList: boolean;
  /** Đang chờ webhook đối soát (D-31); giữ hạn cũ để biết khi nào gia hạn xong */
  waiting: boolean;
  waitFrom: string | null;
  bannerHidden: boolean;
  /**
   * Prototype v4 `svPop`: true = hộp nổi (nền tối, ×). Mở từ menu / vào thẳng URL thì false →
   * Bảng giá là trang trong khung nội dung (`data-pg="1"`)
   */
  popup: boolean;
  setPopup: (v: boolean) => void;
  setRequest: (r: ServiceRequest | null) => void;
  setPayFromList: (v: boolean) => void;
  startWait: (validUntil: string | null) => void;
  endWait: () => void;
  hideBanner: () => void;
  reset: () => void;
}

const INITIAL = {
  request: null,
  payFromList: false,
  waiting: false,
  waitFrom: null,
  bannerHidden: false,
  popup: false,
} as const;

export const usePaywallStore = create<PaywallState>()((set) => ({
  ...INITIAL,
  setPopup: (popup) => set({ popup }),
  setRequest: (request) => set({ request }),
  setPayFromList: (payFromList) => set({ payFromList }),
  startWait: (waitFrom) => set({ waiting: true, waitFrom }),
  endWait: () => set({ waiting: false, waitFrom: null }),
  hideBanner: () => set({ bannerHidden: true }),
  reset: () => set({ ...INITIAL }),
}));
