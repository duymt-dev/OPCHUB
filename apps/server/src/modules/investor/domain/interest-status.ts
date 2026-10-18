import {
  canInvestorTransition,
  INVESTOR_TRANSITIONS,
  type InvestorStatus,
  investorTransitionMessage,
} from '@opchub/shared/api-domains';
import { conflict } from '@/common/errors';

/**
 * Máy trạng thái "Quan tâm đầu tư" (SRS §9, BUG-007, luật 7): Đã gửi → Đang trao đổi → Đã kết nối.
 * Bảng chuyển nằm ở `@opchub/shared` để server, MSW và drawer Admin dùng chung.
 */
export { INVESTOR_TRANSITIONS };

export const canTransition = (from: InvestorStatus, to: InvestorStatus): boolean =>
  canInvestorTransition(from, to);

/** Sai §9 → 409 "Không thể chuyển trạng thái từ <from> sang <to>" */
export function assertTransition(from: InvestorStatus, to: InvestorStatus): void {
  if (!canTransition(from, to)) throw conflict(investorTransitionMessage(from, to));
}

/** Các trạng thái đứng trước `to` — quan tâm nào còn ở đó được kéo lên `to` (không bao giờ lùi) */
export function statusesBefore(to: InvestorStatus): InvestorStatus[] {
  const order: InvestorStatus[] = ['sent', 'in_discussion', 'connected'];
  return order.slice(0, order.indexOf(to));
}
