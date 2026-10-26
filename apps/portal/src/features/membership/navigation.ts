import { isPaywallPath, PAYWALL_PATHS } from './model';
import { usePaywallStore } from './store';

/** Đổi URL bằng history API: Next đồng bộ usePathname, màn nền giữ nguyên (không tải lại) */
export const pushPath = (path: string) => window.history.pushState(null, '', path);

/**
 * Mục "Gói dịch vụ" mở hộp đè lên màn đang xem (như prototype). Trả true nếu đã xử lý,
 * false để khung app điều hướng bình thường.
 */
/**
 * Bảng giá dạng hộp nổi đè lên màn đang xem (prototype `svPop:true`: "Xem bảng giá",
 * "Thanh toán phí thành viên" ở chân sidebar, nút gói ở Hồ sơ).
 */
export function openPricingPopup(): void {
  usePaywallStore.getState().setPopup(true);
  pushPath(PAYWALL_PATHS.list);
}

/** Form đăng ký tư vấn của một dịch vụ trong popup Gói dịch vụ (prototype `wgo` của Trợ lý) */
export function openConsultForm(svcId: string): void {
  usePaywallStore.getState().setPopup(true);
  pushPath(PAYWALL_PATHS.form(svcId));
}

export function openInPlace(href: string): boolean {
  if (!isPaywallPath(href)) return false;
  usePaywallStore.getState().setPopup(false);
  pushPath(href);
  return true;
}
