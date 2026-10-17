import { describe, expect, it } from 'vitest';
import { barHeight, formatCount, growthPct, sparkPoints } from './data';

describe('overview data helpers (B60)', () => {
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
});
