import type { INVESTOR_KINDS } from '@opchub/shared/api-domains';

/** Tab loại trên URL (`?kind=fund`) — trùng enum API */
export const INVESTOR_TABS = ['all', 'fund', 'business', 'individual'] as const;
export type InvestorTab = (typeof INVESTOR_TABS)[number];
export type InvestorKind = (typeof INVESTOR_KINDS)[number];

/** Cỡ trang của prototype: mặc định 10, chọn được 6 / 9 / 12 / 24 */
export const INVESTOR_PAGE_SIZES = [6, 9, 12, 24] as const;
export const INVESTOR_DEFAULT_SIZE = 10;

export interface InvestorParams {
  q: string;
  kind: InvestorTab;
  page: number;
  size: number;
}
