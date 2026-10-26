import { NEED_TYPES } from '@opchub/shared/api-domains';
import { describe, expect, it } from 'vitest';
import { allChecked, NEED_TONE, needDate, needLoc, needSub, toggleAll } from './model';

describe('Admin › Nhu cầu model (TIP-V4-609)', () => {
  it('đủ màu cho 9 loại prototype `NT`', () => {
    expect(Object.keys(NEED_TONE)).toEqual([...NEED_TYPES]);
    expect(NEED_TONE.buy).toEqual({ bg: '#E6F4FF', fg: '#0958D9', bd: '#91CAFF' });
  });

  it('dòng phụ "số lượng · ngành", khu vực "phường, tỉnh", ngày theo giờ VN', () => {
    expect(needSub({ quantity: '200 hộp', field: 'Thủ công & Làng nghề' })).toBe(
      '200 hộp · Thủ công & Làng nghề',
    );
    expect(needSub({ quantity: ' ', field: 'Nông nghiệp' })).toBe('Nông nghiệp');
    expect(needLoc({ ward: 'Phường Bến Nghé', province: 'TP. Hồ Chí Minh' })).toBe(
      'Phường Bến Nghé, TP. Hồ Chí Minh',
    );
    expect(needLoc({ ward: '', province: 'Hà Nội' })).toBe('Hà Nội');
    expect(needDate('2026-10-23T18:00:00Z')).toBe('24/10/2026');
  });

  it('chọn tất cả chỉ trên trang hiện tại, bấm lần nữa bỏ chọn', () => {
    const on = toggleAll(new Set(['x']), ['a', 'b']);
    expect([...on].sort()).toEqual(['a', 'b', 'x']);
    expect(allChecked(on, ['a', 'b'])).toBe(true);
    expect([...toggleAll(on, ['a', 'b'])]).toEqual(['x']);
    expect(allChecked(new Set(), [])).toBe(false);
  });
});
