import { describe, expect, it } from 'vitest';
import { allChecked, itemPrice, storeDate, storeInitials, toggleAll } from './model';

describe('Admin › Gian hàng model (TIP-V4-608)', () => {
  it('chữ viết tắt bỏ tiền tố pháp lý như prototype', () => {
    expect(storeInitials('Công ty TNHH Giải pháp MediaSoft')).toBe('MS');
    expect(storeInitials('HTX Cà phê Hòa Phú')).toBe('CP');
    expect(storeInitials('Thủy sản Sông Đốc')).toBe('TS');
  });

  it('giá trống / 0 → Liên hệ báo giá; ngày theo giờ VN', () => {
    expect(itemPrice({ price: null }, 'Liên hệ báo giá')).toBe('Liên hệ báo giá');
    expect(itemPrice({ price: 0 }, 'Liên hệ báo giá')).toBe('Liên hệ báo giá');
    expect(itemPrice({ price: 450000 }, '')).toBe('450.000đ');
    expect(storeDate('2026-10-23T18:00:00Z')).toBe('24/10/2026');
  });

  it('chọn tất cả chỉ trên trang hiện tại, bấm lần nữa bỏ chọn', () => {
    const on = toggleAll(new Set(['x']), ['a', 'b']);
    expect([...on].sort()).toEqual(['a', 'b', 'x']);
    expect(allChecked(on, ['a', 'b'])).toBe(true);
    expect([...toggleAll(on, ['a', 'b'])]).toEqual(['x']);
    expect(allChecked(new Set(), [])).toBe(false);
  });
});
