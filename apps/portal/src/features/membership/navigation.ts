import { isPaywallPath } from './model';
import { usePaywallStore } from './store';

/** Đổi URL bằng history API: Next đồng bộ usePathname, màn nền giữ nguyên (không tải lại) */
export const pushPath = (path: string) => window.history.pushState(null, '', path);

/**
 * Mục "Gói dịch vụ" mở hộp đè lên màn đang xem (như prototype). Trả true nếu đã xử lý,
 * false để khung app điều hướng bình thường.
 */
export function openInPlace(href: string): boolean {
  if (!isPaywallPath(href)) return false;
  usePaywallStore.getState().setPopup(false);
  pushPath(href);
  return true;
}
