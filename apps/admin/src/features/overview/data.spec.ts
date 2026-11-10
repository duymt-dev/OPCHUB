import { describe, expect, it } from 'vitest';
import {
  barHeight,
  chartAxis,
  chartMax,
  formatCount,
  growthPct,
  rangeLabel,
  sparkPoints,
  overviewKeys,
  statCards,
} from './data';
import { mockOverview } from '@opchub/shared/mock-domains';

describe('overview data helpers (B60)', () => {
  it('REQ-122 all four sparklines stay monthly across week and year tabs', () => {
    const now = new Date('2026-10-16T08:00:00Z');
    const month = statCards(mockOverview({ period: 'month' }, now)).map((c) => c.spark);
    for (const period of ['week', 'year'] as const) {
      expect(statCards(mockOverview({ period }, now)).map((c) => c.spark)).toEqual(month);
    }
    expect(month.every((s) => s.length === 7)).toBe(true);
  });
  it('sparkPoints: 7 điểm trong khung 52×22, lớn nhất ở trên', () => {
    const pts = sparkPoints([1, 2, 3, 4, 5, 6, 7]).split(' ');
    expect(pts).toHaveLength(7);
    expect(pts[0]).toBe('2,18');
    expect(pts[6]).toBe('50,3');
  });
  it('sparkPoints: chuỗi phẳng / rỗng không lỗi', () => {
    expect(sparkPoints([5, 5])).toBe('2,18 50,18');
    expect(sparkPoints([])).toBe('');
  });
  it('formatCount theo vi-VN, barHeight chặn trần, growthPct an toàn khi 0', () => {
    expect(formatCount(4218)).toBe('4.218');
    expect(barHeight(600)).toBe(230);
    expect(barHeight(9999)).toBe(230);
    expect(growthPct(0, 5)).toBe('+0%');
    expect(growthPct(220, 90)).toBe('+14%');
  });

  it('BUG-029 trục biểu đồ theo dữ liệu (làm tròn bậc), khoảng ngày từ API', () => {
    const row = (active: number) => ({ month: 'T1', active, fresh: 0, inactive: 0 });
    expect(chartMax([])).toBe(600);
    expect(chartMax([row(12)])).toBe(15);
    expect(chartMax([row(570)])).toBe(600);
    expect(chartMax([row(4218)])).toBe(5000);
    expect(chartAxis(600)).toEqual([600, 400, 200, 0]);
    expect(barHeight(300, 600)).toBe(115);
    expect(rangeLabel({ from: '2026-10-01', to: '2026-10-20' })).toBe('01/10/2026 – 20/10/2026');
  });

  it('overviewKeys.list: tạo key cô lập theo period và khoảng ngày', () => {
    expect(overviewKeys.list()).toEqual(['admin-overview', 'month', '', '']);
    expect(overviewKeys.list({ period: 'week', from: '2026-10-01', to: '2026-10-20' })).toEqual([
      'admin-overview',
      'week',
      '2026-10-01',
      '2026-10-20',
    ]);
  });
});
