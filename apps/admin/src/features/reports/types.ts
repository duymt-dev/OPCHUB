import type { ReportTemplate } from '@opchub/shared/api-domains';

/** Bộ lọc màn Báo cáo — `scope` là id nhóm (B1), tên tỉnh (B2) hoặc mã vùng (B3) */
export interface ReportFilter {
  template: ReportTemplate;
  month: string;
  scope: string;
}
