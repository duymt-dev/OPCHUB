import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ReportPreview } from '../api-domains/reports';
import { reportCsv, reportLines } from './templates';

const SPEC = join(__dirname, '../../../../docs/spec/mau-bao-cao');
const FILES = {
  b1: 'Mau-B1-Bao-cao-Nhom-nganh.csv',
  b2: 'Mau-B2-Bao-cao-thang-Tinh.csv',
  b3: 'Mau-B3-Bao-cao-Vung.csv',
} as const;
const template = (t: keyof typeof FILES) => readFileSync(join(SPEC, FILES[t]), 'utf8');

const empty = (t: ReportPreview['template']): ReportPreview => ({
  template: t,
  month: '2026-10',
  scope: '',
  province: '',
  leader: '',
  metrics: {
    newMembers: 0,
    newPaidMembers: 0,
    totalMembers: 0,
    activeMembers: 0,
    events: 0,
    topics: 0,
    feeRevenue: 0,
    commission: 0,
    fundraisingRevenue: 0,
    totalRevenue: 0,
  },
  groups: [],
  provinces: [],
});

/** Xoá giá trị đã điền (ô "Thực hiện", tháng, tổng) → phải trùng khít file mẫu */
const blank = (csv: string) =>
  csv
    .split('\n')
    .map((l) => l.replace(/"(\d+|10\/2026)"/g, '""'))
    .join('\n');

describe('V4-614 REQ-516 khuôn CSV B1/B2/B3 = file mẫu docs/spec/mau-bao-cao', () => {
  it.each(['b1', 'b2', 'b3'] as const)(
    '%s: số liệu rỗng → trùng khít file mẫu (BOM, cột, dòng rỗng)',
    (t) => {
      expect(blank(reportCsv(empty(t)))).toBe(template(t));
    },
  );

  it('B1 điền ô "Thực hiện" đúng dòng; chỉ số chưa có nguồn để trống', () => {
    const p = { ...empty('b1'), scope: 'OPC Hà Nội', province: 'Hà Nội', leader: 'An' };
    p.metrics = {
      ...p.metrics,
      newMembers: 3,
      totalMembers: 12,
      activeMembers: 9,
      events: 2,
      topics: 1,
    };
    const lines = reportCsv(p).split('\n');
    expect(lines[1]).toBe('"Tỉnh/Thành","Hà Nội","Tháng/Năm","10/2026"');
    expect(lines[2]).toBe('"Tên nhóm ngành","OPC Hà Nội","Trưởng nhóm","An"');
    expect(lines[5]).toBe('"Thành viên mới","","3",""');
    expect(lines[10]).toBe('"Sự kiện ngành","","2",""');
    expect(lines[12]).toBe('"Kết nối đối tác / nhà cung cấp","","",""');
  });

  it('B2 khối C một dòng / nhóm; B3 dòng tỉnh + Tổng vùng + Top 3 tỉnh', () => {
    const b2 = { ...empty('b2'), province: 'Hà Nội' };
    b2.groups = [
      { groupId: 'g1', name: 'OPC Hà Nội', owner: 'An', members: 5, messages: 40 },
      { groupId: 'g2', name: 'OPC Ngành AI', owner: 'Bình', members: 3, messages: 7 },
    ];
    const l2 = reportLines(b2);
    expect(l2.filter((l) => l?.[0] === 'OPC Ngành AI')).toEqual([
      ['OPC Ngành AI', 'Bình', 3, 7, ''],
    ]);
    const b3 = { ...empty('b3'), scope: 'Miền Bắc' };
    b3.provinces = [
      { province: 'Hà Nội', newMembers: 2, totalMembers: 10, events: 1, feeRevenue: 4_800_000 },
      { province: 'Hải Phòng', newMembers: 1, totalMembers: 4, events: 0, feeRevenue: 1_200_000 },
    ];
    const l3 = reportCsv(b3).split('\n');
    expect(l3).toContain('"Tổng vùng","3","14","1","","6000000",""');
    expect(l3).toContain('"Top 3 tỉnh","Hà Nội; Hải Phòng","","","","",""');
  });
});
