import { z } from 'zod';

/**
 * Admin Tổng quan (B44, Q-B44-1) — `GET /admin/overview` (m.view) + `GET /admin/badges`.
 * KPI hiện tại + chuỗi 7 tháng (tăng trưởng thành viên) từ `stats_daily`.
 */
const kpi = z.object({
  value: z.number().int(),
  /** 7 điểm (7 tháng gần nhất, cũ → mới) cho sparkline */
  spark: z.array(z.number().int()).length(7),
});

export const overviewPeriodSchema = z.enum(['week', 'month', 'year']);
export type OverviewPeriod = z.infer<typeof overviewPeriodSchema>;

export const adminOverviewQuerySchema = z
  .object({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    period: overviewPeriodSchema.default('month'),
  })
  .superRefine(({ from, to }, ctx) => {
    if (!!from !== !!to) {
      ctx.addIssue({
        code: 'custom',
        path: [from ? 'to' : 'from'],
        message: 'Required with the other date',
      });
    }
    if (from && to && from > to) {
      ctx.addIssue({ code: 'custom', path: ['to'], message: 'Must be on or after from' });
    }
  });
export type AdminOverviewQuery = z.infer<typeof adminOverviewQuerySchema>;

export const adminOverviewSchema = z.object({
  /** BUG-029: khoảng số liệu = đầu tháng → hôm nay (giờ VN), dạng YYYY-MM-DD */
  range: z.object({ from: z.string(), to: z.string() }),
  /** % thành viên mới tháng này so với tổng đầu tháng (1 chữ số thập phân) */
  membersDeltaPct: z.number(),
  newThisMonth: z.number().int(),
  /** 7 tháng gần nhất, độc lập period/range (D-140). */
  newMembersSpark: z.array(z.number().int()).length(7),
  communitiesNew: z.number().int(),
  members: kpi,
  communities: kpi,
  projects: kpi.extend({ pending: z.number().int() }),
  /** D-89 v4: tổng sự kiện + số sắp diễn ra ("12 · 4 sắp diễn ra") */
  events: kpi.extend({ upcoming: z.number().int() }),
  /** D-89 v4 biểu đồ: thành viên đã kích hoạt phí (đang hiệu lực), kích hoạt trong tháng, % */
  paid: z.object({
    value: z.number().int(),
    newThisMonth: z.number().int(),
    deltaPct: z.number(),
  }),
  /** D-89 v4 "Luồng hệ thống": số trực tiếp từ các module */
  flow: z.object({
    paidMembers: z.number().int(),
    members: z.number().int(),
    stores: z.object({
      published: z.number().int(),
      hidden: z.number().int(),
      draft: z.number().int(),
    }),
    needs: z.object({ open: z.number().int(), closed: z.number().int() }),
    projects: z.object({ pending: z.number().int(), published: z.number().int() }),
    groups: z.number().int(),
  }),
  /** Nhãn chu kỳ VN (tháng "T4", tuần "W42", hoặc năm "2026"); số đang hoạt động / mới / chưa kích hoạt phí */
  growth: z
    .array(
      z.object({
        month: z.string(),
        active: z.number().int(),
        fresh: z.number().int(),
        inactive: z.number().int(),
      }),
    )
    .min(1)
    .max(12),
});
export type AdminOverview = z.infer<typeof adminOverviewSchema>;

/** Số việc chờ trên sidebar theo quyền người gọi (không có quyền → 0) */
export const adminBadgesSchema = z.object({
  reports: z.number().int(),
  projects: z.number().int(),
  requests: z.number().int(),
});
export type AdminBadges = z.infer<typeof adminBadgesSchema>;

const conversionCountsSchema = z.object({
  trial: z.number().int().nonnegative(),
  paid: z.number().int().nonnegative(),
  expired: z.number().int().nonnegative(),
  ratePct: z.number().int().min(0).max(100),
});
export const conversionRowSchema = conversionCountsSchema.extend({
  region: z.enum(['north', 'central', 'south']),
  label: z.string(),
  directorName: z.string().nullable(),
});
export const adminConversionSchema = z.object({
  rows: z.array(conversionRowSchema).length(3),
  total: conversionCountsSchema,
});
export type AdminConversion = z.infer<typeof adminConversionSchema>;
export type ConversionRow = z.infer<typeof conversionRowSchema>;
