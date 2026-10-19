import { canInvestorTransition, type InvestorStatus } from '@opchub/shared/api-domains';
import type { InvestorKind } from './types';

/** Hiển thị: tiền như MONEY() của prototype, ngày/giờ theo giờ VN (luật 9) */

export function money(n: number, cur: 'VND' | 'USD' = 'VND'): string {
  const v = Number.isFinite(n) ? n : 0;
  if (cur === 'USD') {
    if (v >= 1e6) return `$${(v / 1e6).toFixed(v % 1e6 ? 1 : 0)}M`;
    return v >= 1e3 ? `$${Math.round(v / 1e3)}K` : `$${v}`;
  }
  if (v >= 1e9) return `${(v / 1e9).toFixed(v % 1e9 ? 1 : 0).replace('.', ',')} tỷ ₫`;
  if (v >= 1e6) return `${Math.round(v / 1e6)} triệu ₫`;
  return `${v.toLocaleString('vi-VN')} ₫`;
}

const TZ = 'Asia/Ho_Chi_Minh';
const DATE = new Intl.DateTimeFormat('vi-VN', { timeZone: TZ });
const TIME = new Intl.DateTimeFormat('vi-VN', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** "16/10/2026" (toLocaleDateString của prototype, không đệm 0) */
export const shortDate = (iso: string) => DATE.format(new Date(iso));
/** "07:00 · 16/10/2026" */
export const stamp = (iso: string) => `${TIME.format(new Date(iso))} · ${shortDate(iso)}`;

/** Màu nhãn loại (INV_KIND) và trạng thái kết nối (IVS) — lớp CSS cùng tên */
export const KIND_TONE: Record<InvestorKind, 'fund' | 'biz' | 'angel'> = {
  fund: 'fund',
  business: 'biz',
  individual: 'angel',
};
export const STATUS_TONE: Record<InvestorStatus, 'sent' | 'talk' | 'done'> = {
  sent: 'sent',
  in_discussion: 'talk',
  connected: 'done',
};

/** Chữ cái đầu của từ cuối tên (prototype `ini`) */
export const lastInitial = (name: string) => (name.split(' ').pop() ?? '?').charAt(0) || '?';

/** Dự án quan tâm, bỏ trùng, nối bằng ", " */
export const projectList = (names: string[]) => [...new Set(names)].join(', ');

/** BUG-007, §9: bước nào bấm được từ trạng thái hiện tại (chỉ đi tiến, không nhảy cóc) */
export const canStep = (from: InvestorStatus, to: InvestorStatus): boolean =>
  canInvestorTransition(from, to);
