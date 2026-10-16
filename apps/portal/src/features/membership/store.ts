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
  /** Lời nhắn "Thách thức lớn nhất…" (chưa có trường API — Q-G3a-3) */
  note: string;
  bannerHidden: boolean;
  setRequest: (r: ServiceRequest | null) => void;
  setPayFromList: (v: boolean) => void;
  startWait: (validUntil: string | null) => void;
  endWait: () => void;
  setNote: (note: string) => void;
  hideBanner: () => void;
  reset: () => void;
}

const INITIAL = {
  request: null,
  payFromList: false,
  waiting: false,
  waitFrom: null,
  note: '',
  bannerHidden: false,
} as const;

export const usePaywallStore = create<PaywallState>()((set) => ({
  ...INITIAL,
  setRequest: (request) => set({ request }),
  setPayFromList: (payFromList) => set({ payFromList }),
  startWait: (waitFrom) => set({ waiting: true, waitFrom }),
  endWait: () => set({ waiting: false, waitFrom: null }),
  setNote: (note) => set({ note }),
  hideBanner: () => set({ bannerHidden: true }),
  reset: () => set({ ...INITIAL }),
}));
