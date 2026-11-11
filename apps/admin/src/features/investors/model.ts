import { compactMoney } from '@/i18n/compact-money';
import { formatDate } from '@/i18n/format';
import type { InvestorKind } from './types';

/** Hiển thị: tiền như MONEY() của prototype, ngày/giờ theo giờ VN (luật 9) */

export const money = (n: number, cur: 'VND' | 'USD' = 'VND', locale = 'vi') =>
  compactMoney(n, cur, locale);

/** "16/10/2026" (toLocaleDateString của prototype, không đệm 0) */
export const shortDate = (iso: string, locale = 'vi') =>
  formatDate(iso, locale, { year: 'numeric', month: 'numeric', day: 'numeric' });
/** "07:00 · 16/10/2026" */
export const stamp = (iso: string, locale = 'vi') => {
  const time = formatDate(iso, locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return time === '—' ? time : time + ' · ' + shortDate(iso, locale);
};

/** Màu nhãn loại (INV_KIND) — lớp CSS cùng tên */
export const KIND_TONE: Record<InvestorKind, 'fund' | 'biz' | 'angel'> = {
  fund: 'fund',
  business: 'biz',
  individual: 'angel',
};

/** Chữ cái đầu của từ cuối tên (prototype `ini`) */
export const lastInitial = (name: string) => (name.split(' ').pop() ?? '?').charAt(0) || '?';

/** Dự án quan tâm, bỏ trùng, nối bằng ", " */
export const projectList = (names: string[]) => [...new Set(names)].join(', ');
