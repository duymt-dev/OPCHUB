import { MOCK_NOW, OVERVIEW_FIXTURE } from '@opchub/shared/mock-domains';
import type { DbTx } from '../../src/client';

/**
 * Domain reporting (Q-B63-1): `stats_daily` cho 7 tháng của Admin Tổng quan — mỗi tháng một ảnh
 * chụp vào ngày cuối tháng (tháng hiện tại: ngày MOCK_NOW giờ VN) bằng đúng số prototype mà MSW
 * trả (`OVERVIEW_FIXTURE`): sparkline 4 KPI + biểu đồ tăng trưởng (`members_new` = cột "mới").
 * Bảng không có FK; xoá dòng trong khoảng 7 tháng rồi ghi lại (job thật ghi ON CONFLICT cùng PK).
 */

const VN_OFFSET_MS = 7 * 3_600_000;

/** Ngày chụp (YYYY-MM-DD) của 7 tháng, cũ → mới — cùng quy tắc `lastMonths` của server */
function snapshotDays(): string[] {
  const vn = new Date(MOCK_NOW + VN_OFFSET_MS);
  const [y, m] = [vn.getUTCFullYear(), vn.getUTCMonth()];
  return Array.from({ length: 7 }, (_, i) => {
    const last = i === 6 ? vn : new Date(Date.UTC(y, m - (6 - i) + 1, 0));
    return last.toISOString().slice(0, 10);
  });
}

export async function seedStatsDaily(tx: DbTx): Promise<void> {
  const days = snapshotDays();
  const f = OVERVIEW_FIXTURE;
  const rows = days.flatMap((day, i) => {
    const g = f.growth[i];
    const at = (spark: number[]) => BigInt(spark[i] ?? 0);
    const metrics: [string, bigint][] = [
      ['members_total', at(f.members.spark)],
      ['members_new', BigInt(g?.fresh ?? 0)],
      ['members_active', BigInt(g?.active ?? 0)],
      ['members_inactive', BigInt(g?.inactive ?? 0)],
      ['groups', at(f.communities.spark)],
      ['projects_live', at(f.projects.spark)],
      ['events_upcoming', at(f.events.spark)],
    ];
    return metrics.map(([metric, value]) => ({
      day: new Date(`${day}T00:00:00Z`),
      metric,
      dimension: '',
      value,
    }));
  });
  const first = new Date(`${(days[0] ?? '').slice(0, 7)}-01T00:00:00Z`);
  await tx.statsDaily.deleteMany({ where: { day: { gte: first }, dimension: '' } });
  await tx.statsDaily.createMany({ data: rows });
}
