import { REGION_LABEL_SHORT } from '../regions/region-labels';
import { z } from 'zod';

/**
 * Admin › Báo cáo (V4-614, D-78, REQ-516): tổng hợp tháng + xuất CSV theo mẫu
 * `docs/spec/mau-bao-cao/Mau-B1/B2/B3`. Không có kế hoạch / vai trò vùng-tỉnh: cột "Kế hoạch",
 * "% đạt", người ký để trống; chỉ số chưa có nguồn trên hệ thống = `null` (ô trống).
 */
export const REPORT_TEMPLATES = ['b1', 'b2', 'b3'] as const;
export type ReportTemplate = (typeof REPORT_TEMPLATES)[number];

/** Vùng theo `groups.region` (prototype REGION(): Miền Bắc / Trung / Nam) */
export const REPORT_REGIONS = ['north', 'central', 'south'] as const;
export type ReportRegion = (typeof REPORT_REGIONS)[number];
export const REPORT_REGION_LABEL = REGION_LABEL_SHORT;

/** Tháng `YYYY-MM` (giờ Việt Nam) */
export const reportMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

/** Phạm vi theo mẫu: B1 một nhóm, B2 một tỉnh, B3 một vùng */
export const reportParamsSchema = z.discriminatedUnion('template', [
  z.object({ template: z.literal('b1'), month: reportMonthSchema, groupId: z.string().min(1) }),
  z.object({
    template: z.literal('b2'),
    month: reportMonthSchema,
    province: z.string().trim().min(1).max(100),
  }),
  z.object({ template: z.literal('b3'), month: reportMonthSchema, region: z.enum(REPORT_REGIONS) }),
]);
export type ReportParams = z.infer<typeof reportParamsSchema>;

/** Query preview (khác `reportQuerySchema` của kiểm duyệt): `?template=b2&month=2026-10&province=Hà Nội` (giá trị phạm vi không thuộc mẫu bị bỏ) */
export const reportPreviewQuerySchema = z
  .object({
    template: z.enum(REPORT_TEMPLATES),
    month: reportMonthSchema,
    groupId: z.string().optional(),
    province: z.string().optional(),
    region: z.string().optional(),
  })
  .transform((q, ctx) => {
    const r = reportParamsSchema.safeParse(q);
    if (r.success) return r.data;
    for (const i of r.error.issues) ctx.addIssue({ ...i, code: 'custom', message: i.message });
    return z.NEVER;
  });

export const REPORT_METRIC_KEYS = [
  'newMembers',
  'newPaidMembers',
  'totalMembers',
  'activeMembers',
  'events',
  'topics',
  'feeRevenue',
  'commission',
  'fundraisingRevenue',
  'totalRevenue',
] as const;
export type ReportMetricKey = (typeof REPORT_METRIC_KEYS)[number];

/** Số liệu của một phạm vi trong tháng (null = chưa có nguồn dữ liệu) */
export const reportMetricsSchema = z.object({
  newMembers: z.number().int(),
  newPaidMembers: z.number().int(),
  totalMembers: z.number().int(),
  activeMembers: z.number().int(),
  events: z.number().int(),
  topics: z.number().int(),
  feeRevenue: z.number().int(),
  commission: z.number().int(),
  fundraisingRevenue: z.number().int(),
  totalRevenue: z.number().int(),
});
export type ReportMetrics = z.infer<typeof reportMetricsSchema>;

/** B2 khối C — một dòng / nhóm của tỉnh */
export const reportGroupRowSchema = z.object({
  groupId: z.string(),
  name: z.string(),
  owner: z.string(),
  members: z.number().int(),
  /** Tin nhắn thành viên gửi trong tháng (không tính bot / hệ thống) */
  messages: z.number().int(),
});
export type ReportGroupRow = z.infer<typeof reportGroupRowSchema>;

/** B3 — một dòng / tỉnh có nhóm của vùng */
export const reportProvinceRowSchema = z.object({
  province: z.string(),
  newMembers: z.number().int(),
  totalMembers: z.number().int(),
  events: z.number().int(),
  feeRevenue: z.number().int(),
});
export type ReportProvinceRow = z.infer<typeof reportProvinceRowSchema>;

export const reportPreviewSchema = z.object({
  template: z.enum(REPORT_TEMPLATES),
  month: reportMonthSchema,
  /** Tên phạm vi: tên nhóm / tỉnh / vùng */
  scope: z.string(),
  /** B1: tỉnh của nhóm; B2: tỉnh; B3: rỗng */
  province: z.string(),
  /** B1: trưởng nhóm (chủ nhóm) */
  leader: z.string(),
  metrics: reportMetricsSchema,
  groups: z.array(reportGroupRowSchema),
  provinces: z.array(reportProvinceRowSchema),
});
export type ReportPreview = z.infer<typeof reportPreviewSchema>;

export const reportScopesSchema = z.object({
  groups: z.array(z.object({ id: z.string(), name: z.string(), province: z.string() })),
  provinces: z.array(z.object({ name: z.string(), region: z.enum(REPORT_REGIONS) })),
});
export type ReportScopes = z.infer<typeof reportScopesSchema>;

export const reportExportResponseSchema = z.object({
  jobId: z.string(),
  status: z.literal('queued'),
});

/** `2026-10` → `10/2026` (ô Tháng/Năm của mẫu) */
export const reportMonthLabel = (month: string) => `${month.slice(5, 7)}/${month.slice(0, 4)}`;

/** Tên file tải không dấu: `Bao-cao-B2-2026-10-Ha-Noi.csv` */
export function reportFileName(template: ReportTemplate, month: string, scope: string): string {
  const slug = scope
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, (c) => (c === 'đ' ? 'd' : 'D'))
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `Bao-cao-${template.toUpperCase()}-${month}${slug ? `-${slug}` : ''}.csv`;
}
