import {
  REPORT_REGIONS,
  type ReportMetricKey,
  type ReportParams,
  type ReportScopes,
  type ReportTemplate,
} from '@opchub/shared/api-domains';
import type { ReportFilter } from './types';

const VN_OFFSET_MS = 7 * 3_600_000;

/** 12 tháng gần nhất theo giờ VN, mới → cũ, bỏ tháng hiện tại (chưa kết thúc) */
export function reportMonths(now: number): string[] {
  const d = new Date(now + VN_OFFSET_MS);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  return Array.from({ length: 12 }, (_, i) =>
    new Date(Date.UTC(y, m - 1 - i, 1)).toISOString().slice(0, 7),
  );
}

/** `2026-10` → `10/2026` */
export const monthLabel = (month: string) => `${month.slice(5, 7)}/${month.slice(0, 4)}`;

/** Phạm vi mặc định của mẫu: nhóm / tỉnh đầu tiên, vùng Miền Bắc */
export function defaultScope(template: ReportTemplate, scopes: ReportScopes | undefined): string {
  if (template === 'b3') return REPORT_REGIONS[0];
  if (!scopes) return '';
  return (template === 'b1' ? scopes.groups[0]?.id : scopes.provinces[0]?.name) ?? '';
}

/** Bộ lọc → tham số API; thiếu phạm vi → null (chưa gọi xem trước) */
export function toParams(f: ReportFilter): ReportParams | null {
  if (!f.scope) return null;
  if (f.template === 'b1') return { template: 'b1', month: f.month, groupId: f.scope };
  if (f.template === 'b2') return { template: 'b2', month: f.month, province: f.scope };
  const region = REPORT_REGIONS.find((r) => r === f.scope);
  return region ? { template: 'b3', month: f.month, region } : null;
}

/** Thẻ số liệu: 4 chỉ số đầu của mẫu */
export const KPI_KEYS: Record<ReportTemplate, readonly ReportMetricKey[]> = {
  b1: ['newMembers', 'totalMembers', 'activeMembers', 'events'],
  b2: ['newPaidMembers', 'activeMembers', 'events', 'feeRevenue'],
  b3: ['newMembers', 'totalMembers', 'events', 'feeRevenue'],
};

/** Bảng chỉ số đầy đủ theo thứ tự mẫu; `empty` = chỉ số chưa có nguồn dữ liệu (hiện "—") */
export type MetricRow =
  | { key: ReportMetricKey }
  | { key: 'contracts' | 'sponsorship' | 'partners' | 'opportunities'; empty: true };
export const METRIC_ROWS: Record<ReportTemplate, readonly MetricRow[]> = {
  b1: [
    { key: 'newMembers' },
    { key: 'totalMembers' },
    { key: 'activeMembers' },
    { key: 'events' },
    { key: 'topics' },
    { key: 'partners', empty: true },
    { key: 'opportunities', empty: true },
  ],
  b2: [
    { key: 'newPaidMembers' },
    { key: 'activeMembers' },
    { key: 'events' },
    { key: 'contracts', empty: true },
    { key: 'sponsorship', empty: true },
    { key: 'feeRevenue' },
    { key: 'commission' },
    { key: 'totalRevenue' },
  ],
  b3: [
    { key: 'newMembers' },
    { key: 'totalMembers' },
    { key: 'events' },
    { key: 'feeRevenue' },
    { key: 'fundraisingRevenue' },
    { key: 'totalRevenue' },
  ],
};

const vnd = new Intl.NumberFormat('vi-VN');
export const fmt = (n: number) => vnd.format(n);
