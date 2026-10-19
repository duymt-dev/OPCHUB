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

export const adminOverviewSchema = z.object({
  /** BUG-029: khoảng số liệu = đầu tháng → hôm nay (giờ VN), dạng YYYY-MM-DD */
  range: z.object({ from: z.string(), to: z.string() }),
  /** % thành viên mới tháng này so với tổng đầu tháng (1 chữ số thập phân) */
  membersDeltaPct: z.number(),
  newThisMonth: z.number().int(),
  communitiesNew: z.number().int(),
  members: kpi,
  communities: kpi,
  projects: kpi.extend({ pending: z.number().int() }),
  events: kpi,
  /** Tháng VN, cũ → mới: nhãn "T4"…; số đang hoạt động / mới / chưa kích hoạt phí */
  growth: z
    .array(
      z.object({
        month: z.string(),
        active: z.number().int(),
        fresh: z.number().int(),
        inactive: z.number().int(),
      }),
    )
    .length(7),
});
export type AdminOverview = z.infer<typeof adminOverviewSchema>;

/** Số việc chờ trên sidebar theo quyền người gọi (không có quyền → 0) */
export const adminBadgesSchema = z.object({
  reports: z.number().int(),
  projects: z.number().int(),
  requests: z.number().int(),
});
export type AdminBadges = z.infer<typeof adminBadgesSchema>;
