import {
  REPORT_REGION_LABEL,
  type ReportParams,
  type ReportPreview,
  reportMonthLabel,
} from '../api-domains/reports';

/**
 * Khuôn CSV đúng `docs/spec/mau-bao-cao/Mau-B1/B2/B3` (V4-614): BOM UTF-8, mọi ô trong ngoặc
 * kép, dòng `\n`, giữa các khối là **dòng rỗng** (không có ô). Cột "Kế hoạch", "% đạt", "Ghi chú",
 * người ký để trống (D-78: không hệ kế hoạch / vai trò vùng-tỉnh). Chỉ số chưa có nguồn → ô trống.
 * Dùng chung server (worker export) + MSW để hai bên ra cùng một file.
 */
type Cell = string | number | null;
/** `null` = dòng rỗng giữa các khối */
export type ReportLine = readonly Cell[] | null;

const BOM = String.fromCharCode(0xfeff);
const cell = (v: Cell) => `"${v === null ? '' : String(v).replace(/"/g, '""')}"`;
const pad = (row: readonly Cell[], width: number): Cell[] => [
  ...row,
  ...Array<Cell>(Math.max(0, width - row.length)).fill(''),
];

export function toReportCsv(lines: readonly ReportLine[], width: number): string {
  const body = lines.map((l) => (l === null ? '' : pad(l, width).map(cell).join(','))).join('\n');
  return `${BOM}${body}`;
}

/** Ô "Thực hiện" của dòng chỉ số: mẫu 4 cột = [Chỉ số, Kế hoạch, Thực hiện, Ghi chú] */
const metric = (label: string, value: Cell): Cell[] => [label, '', value, ''];

function b1(p: ReportPreview): ReportLine[] {
  const m = p.metrics;
  return [
    ['MẪU B1 – BÁO CÁO THÁNG NHÓM NGÀNH'],
    ['Tỉnh/Thành', p.province, 'Tháng/Năm', reportMonthLabel(p.month)],
    ['Tên nhóm ngành', p.scope, 'Trưởng nhóm', p.leader],
    null,
    ['Chỉ số', 'Kế hoạch', 'Thực hiện', 'Ghi chú'],
    metric('Thành viên mới', m.newMembers),
    metric('Tổng thành viên', m.totalMembers),
    metric('Thành viên hoạt động', m.activeMembers),
    metric('Số Coffee Chat', m.events),
    metric('Số chủ đề thảo luận', m.topics),
    metric('Sự kiện ngành', m.events),
    null,
    metric('Kết nối đối tác / nhà cung cấp', null),
    metric('Cơ hội hợp tác', null),
    metric('Đề xuất đào tạo / hỗ trợ', null),
    null,
    ['Hạn nộp: ngày 25 hằng tháng – gửi Trưởng đại diện Tỉnh'],
  ];
}

/** Mẫu B2 5 cột: [Chỉ số, Kế hoạch, Thực hiện, % đạt, Ghi chú] */
const metric5 = (label: string, value: Cell): Cell[] => [label, '', value, '', ''];

function b2(p: ReportPreview): ReportLine[] {
  const m = p.metrics;
  const groups: Cell[][] = p.groups.length
    ? p.groups.map((g) => [g.name, g.owner, g.members, g.messages, ''])
    : [[], [], []];
  return [
    ['MẪU B2 – BÁO CÁO THÁNG CỘNG ĐỒNG OPC TỈNH'],
    ['Tỉnh/Thành', p.province, 'Tháng/Năm', reportMonthLabel(p.month)],
    ['Trưởng đại diện', '', 'Giám đốc Vùng', ''],
    null,
    ['B. CHỈ SỐ THÁNG', 'Kế hoạch', 'Thực hiện', '% đạt', 'Ghi chú'],
    metric5('Thành viên mới đóng phí', m.newPaidMembers),
    metric5('Tổng thành viên hoạt động', m.activeMembers),
    metric5('Sự kiện / Coffee Chat', m.events),
    metric5('Hợp đồng G2B/B2B', null),
    metric5('Tài trợ sự kiện (đ)', null),
    metric5('Doanh thu phí thành viên (đ)', m.feeRevenue),
    metric5('Hoa hồng affiliate phát sinh (đ)', m.commission),
    metric5('Tổng doanh thu (đ)', m.totalRevenue),
    null,
    ['C. NHÓM NGÀNH', 'Trưởng nhóm', 'Thành viên', 'Hoạt động trong tháng', 'Ghi chú'],
    ...groups,
    null,
    ['D. Kết quả nổi bật (tối đa 3 ý)'],
    ['E. Khó khăn & đề xuất'],
    ['F. Kế hoạch tháng sau'],
    null,
    ['G. Xác nhận', 'Trưởng tỉnh ký', 'Giám đốc Vùng duyệt', 'Ngày nộp', ''],
    ['Hạn nộp: ngày 28 hằng tháng'],
  ];
}

function b3(p: ReportPreview): ReportLine[] {
  const rows: Cell[][] = p.provinces.length
    ? p.provinces.map((r) => [
        r.province,
        r.newMembers,
        r.totalMembers,
        r.events,
        '',
        r.feeRevenue,
        '',
      ])
    : [[], [], []];
  const sum = (k: 'newMembers' | 'totalMembers' | 'events' | 'feeRevenue') =>
    p.provinces.reduce((a, r) => a + r[k], 0);
  const top = [...p.provinces]
    .filter((r) => r.feeRevenue > 0)
    .sort((a, b) => b.feeRevenue - a.feeRevenue || a.province.localeCompare(b.province, 'vi'))
    .slice(0, 3)
    .map((r) => r.province)
    .join('; ');
  const source = (label: string, value: Cell): Cell[] => [label, '', value];
  return [
    ['MẪU B3 – BÁO CÁO VÙNG (THÁNG / QUÝ)'],
    ['Vùng', p.scope, 'Giám đốc Vùng', '', 'Kỳ báo cáo', reportMonthLabel(p.month)],
    null,
    [
      'BẢNG KPI THEO TỈNH',
      'Thành viên mới',
      'Tổng thành viên',
      'Sự kiện',
      'Hợp đồng',
      'Doanh thu (đ)',
      '% đạt KPI',
    ],
    ...rows,
    ['Tổng vùng', sum('newMembers'), sum('totalMembers'), sum('events'), '', sum('feeRevenue'), ''],
    null,
    ['DOANH THU THEO NGUỒN', 'Kế hoạch', 'Thực hiện'],
    source('Phí thành viên', p.metrics.feeRevenue),
    source('Chương trình cho tổ chức', null),
    source('Đào tạo & Ươm mầm', null),
    source('Công cụ & Giải pháp số', null),
    source('Hợp tác & Dự án', null),
    source('Sự kiện & Tài trợ', null),
    null,
    ['Top 3 tỉnh', top],
    ['Tỉnh cần hỗ trợ'],
    ['Đề xuất Trung tâm (nhân sự, ngân sách, chính sách)'],
    null,
    ['Hạn nộp: ngày 5 tháng sau – gửi Ban điều hành'],
  ];
}

export const REPORT_WIDTH = { b1: 4, b2: 5, b3: 7 } as const;

export function reportLines(p: ReportPreview): ReportLine[] {
  return p.template === 'b1' ? b1(p) : p.template === 'b2' ? b2(p) : b3(p);
}

export const reportCsv = (p: ReportPreview) =>
  toReportCsv(reportLines(p), REPORT_WIDTH[p.template]);

/** Nhãn phạm vi cho tên file / audit */
export function reportScopeLabel(p: ReportParams, scope: string): string {
  return p.template === 'b3' ? REPORT_REGION_LABEL[p.region] : scope;
}
