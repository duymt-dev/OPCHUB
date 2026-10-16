import { describe, expect, it } from 'vitest';
import { communities, demoAccounts, provinces, regionOf } from './index';

describe('fixtures từ prototype', () => {
  it('có đủ 34 tỉnh/thành và 34 nhóm cộng đồng', () => {
    expect(provinces).toHaveLength(34);
    expect(communities).toHaveLength(34);
  });

  it('mỗi nhóm thuộc một tỉnh có trong danh sách', () => {
    const names = new Set(provinces.map(([name]) => name));
    expect(communities.every((c) => names.has(c.province))).toBe(true);
  });

  it('regionOf trả vùng đúng và "Khác" khi không biết', () => {
    expect(regionOf('Hà Nội')).toBe('Miền Bắc');
    expect(regionOf('Không tồn tại')).toBe('Khác');
  });

  it('có tài khoản demo user và admin', () => {
    expect(demoAccounts.map((a) => a.role).sort()).toEqual(['admin', 'user']);
  });
});

describe('fixtures đăng ký', async () => {
  const { phoneCountries, registerGroups, languageOptions } = await import('./register');
  it('10 mã quốc gia, 34 nhóm có màu, 12 ngôn ngữ', () => {
    expect(phoneCountries[0]).toMatchObject({ id: 'vn', dial: '+84' });
    expect(registerGroups).toHaveLength(34);
    expect(registerGroups[1]?.tone.fg).toBe('#FF4D4F');
    expect(languageOptions).toHaveLength(12);
  });
});
