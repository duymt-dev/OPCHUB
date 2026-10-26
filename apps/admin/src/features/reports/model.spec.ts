import { describe, expect, it } from 'vitest';
import { defaultScope, monthLabel, reportMonths, toParams } from './model';

const scopes = {
  groups: [{ id: 'c1', name: 'OPC Hà Nội', province: 'Hà Nội' }],
  provinces: [{ name: 'Hà Nội', region: 'north' as const }],
};

describe('Báo cáo — model (V4-614)', () => {
  it('12 tháng VN gần nhất, mới → cũ, bỏ tháng đang chạy; qua năm đúng', () => {
    // 01:00 01/11/2026 giờ VN (18:00 31/10 UTC) → tháng đang chạy là 11 → bắt đầu từ 10
    const m = reportMonths(Date.UTC(2026, 9, 31, 18));
    expect(m).toHaveLength(12);
    expect(m[0]).toBe('2026-10');
    expect(m[11]).toBe('2025-11');
    expect(monthLabel('2026-10')).toBe('10/2026');
  });

  it('phạm vi mặc định + tham số theo mẫu; thiếu / sai phạm vi → null', () => {
    expect(defaultScope('b1', scopes)).toBe('c1');
    expect(defaultScope('b2', scopes)).toBe('Hà Nội');
    expect(defaultScope('b3', undefined)).toBe('north');
    expect(defaultScope('b1', undefined)).toBe('');
    expect(toParams({ template: 'b2', month: '2026-09', scope: 'Hà Nội' })).toEqual({
      template: 'b2',
      month: '2026-09',
      province: 'Hà Nội',
    });
    expect(toParams({ template: 'b1', month: '2026-09', scope: '' })).toBeNull();
    expect(toParams({ template: 'b3', month: '2026-09', scope: 'west' })).toBeNull();
  });
});
