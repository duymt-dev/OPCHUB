import {
  REPORT_REGION_LABEL,
  REPORT_REGIONS,
  type ReportMetrics,
  type ReportParams,
  type ReportPreview,
  type ReportProvinceRow,
  type ReportRegion,
  type ReportScopes,
} from '../../api-domains';
import { LEGACY_ANNUAL_FEE } from '../../membership/plans';
import { mockDb } from './store';
import { MOCK_NOW, notFound, ok, type MockResult } from './util';

/**
 * V4-614 (D-78) Admin › Báo cáo ở MSW: số liệu tháng dựng tất định từ kho nhóm mock (số thành viên,
 * hoạt động tuần) theo cùng phạm vi B1 nhóm / B2 tỉnh / B3 vùng như server. Chỉ để dựng màn + CSV;
 * số thật do server tổng hợp từ bảng (report-metrics.repository).
 */
/** Prototype báo cáo `FEE=600000` (số dựng màn, không phải giá bán — số thật ở server) */
const FEE = LEGACY_ANNUAL_FEE;

interface MockGroup {
  id: string;
  name: string;
  province: string;
  region: string;
  memberCount: number;
  weeklyActive: number;
}

const regionKey = (label: string): ReportRegion | null =>
  REPORT_REGIONS.find((r) => REPORT_REGION_LABEL[r] === label) ?? null;

/** Hệ số tháng 0,8 → 1,2 (tất định theo tháng) để các tháng khác số */
const monthFactor = (month: string) => 0.8 + (Number(month.slice(5, 7)) % 5) / 10;

function groupMetrics(g: MockGroup, month: string) {
  const f = monthFactor(month);
  const newMembers = Math.round(g.memberCount * 0.04 * f);
  const newPaid = Math.round(newMembers * 0.6);
  return {
    newMembers,
    newPaidMembers: newPaid,
    totalMembers: g.memberCount,
    activeMembers: Math.min(g.memberCount, Math.round(g.weeklyActive * 1.1)),
    events: Math.max(1, Math.round((g.memberCount / 400) * f)),
    topics: Math.round((g.weeklyActive / 300) * f),
    feeRevenue: newPaid * FEE,
    commission: Math.round(newPaid * FEE * 0.1),
    fundraisingRevenue: 0,
    messages: Math.round(g.weeklyActive * 4.3 * f),
  };
}

function sum(groups: MockGroup[], month: string): ReportMetrics {
  const m = groups.map((g) => groupMetrics(g, month));
  const s = (k: Exclude<keyof ReportMetrics, 'totalRevenue'>) => m.reduce((a, x) => a + x[k], 0);
  const feeRevenue = s('feeRevenue');
  const fundraisingRevenue = s('fundraisingRevenue');
  return {
    newMembers: s('newMembers'),
    newPaidMembers: s('newPaidMembers'),
    totalMembers: s('totalMembers'),
    activeMembers: s('activeMembers'),
    events: s('events'),
    topics: s('topics'),
    feeRevenue,
    commission: s('commission'),
    fundraisingRevenue,
    totalRevenue: feeRevenue + fundraisingRevenue,
  };
}

/** Tháng VN hiện tại của kho mock (`YYYY-MM`) */
export const mockReportMonthNow = () =>
  new Date(MOCK_NOW + 7 * 3_600_000).toISOString().slice(0, 7);

export function mockReportScopes(): ReportScopes {
  const groups = mockDb().groups;
  const provinces = new Map<string, ReportRegion>();
  for (const g of groups) {
    const r = regionKey(g.region);
    if (r && !provinces.has(g.province)) provinces.set(g.province, r);
  }
  return {
    groups: groups.map(({ id, name, province }) => ({ id, name, province })),
    provinces: [...provinces].map(([name, region]) => ({ name, region })),
  };
}

const ownerOf = (g: MockGroup) => `Trưởng nhóm ${g.name.replace(/^OPC\s+/, '')}`;

export function mockReportPreview(p: ReportParams): MockResult<ReportPreview> {
  const all = mockDb().groups;
  const groups =
    p.template === 'b1'
      ? all.filter((g) => g.id === p.groupId)
      : p.template === 'b2'
        ? all.filter((g) => g.province === p.province)
        : all.filter((g) => regionKey(g.region) === p.region);
  const first = groups[0];
  if (!first) return notFound('Không tìm thấy phạm vi báo cáo');
  const base = { template: p.template, month: p.month, metrics: sum(groups, p.month) };
  if (p.template === 'b1')
    return ok({
      ...base,
      scope: first.name,
      province: first.province,
      leader: ownerOf(first),
      groups: [],
      provinces: [],
    });
  if (p.template === 'b2')
    return ok({
      ...base,
      scope: p.province,
      province: p.province,
      leader: '',
      groups: groups.map((g) => ({
        groupId: g.id,
        name: g.name,
        owner: ownerOf(g),
        members: g.memberCount,
        messages: groupMetrics(g, p.month).messages,
      })),
      provinces: [],
    });
  const byProvince = new Map<string, MockGroup[]>();
  for (const g of groups) byProvince.set(g.province, [...(byProvince.get(g.province) ?? []), g]);
  const provinces: ReportProvinceRow[] = [...byProvince]
    .sort(([a], [b]) => a.localeCompare(b, 'vi'))
    .map(([province, gs]) => {
      const m = sum(gs, p.month);
      return {
        province,
        newMembers: m.newMembers,
        totalMembers: m.totalMembers,
        events: m.events,
        feeRevenue: m.feeRevenue,
      };
    });
  return ok({
    ...base,
    scope: REPORT_REGION_LABEL[p.region],
    province: '',
    leader: '',
    groups: [],
    provinces,
  });
}
