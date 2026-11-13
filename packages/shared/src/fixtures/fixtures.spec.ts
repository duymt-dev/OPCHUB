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
    expect(demoAccounts.map((a) => a.role).sort()).toEqual([
      'admin',
      'user',
      'user',
      'user',
      'user',
    ]);
  });
});

describe('fixtures đăng ký', async () => {
  const { phoneCountries, registerGroups, languageOptions } = await import('./register');
  const { localeCountry } = await import('./locale');
  it('10 mã quốc gia, 34 nhóm có màu, 12 ngôn ngữ (D-142 AC825-01)', () => {
    expect(phoneCountries[0]).toMatchObject({ id: 'vn', dial: '+84' });
    expect(registerGroups).toHaveLength(34);
    expect(registerGroups[1]?.tone.fg).toBe('#FF4D4F');
    expect(languageOptions).toHaveLength(12);
    expect(languageOptions.map((l) => [l.code, l.country])).toEqual([
      ['vi', 'Việt Nam'],
      ['en', 'Anh'],
      ['zh', 'Trung Quốc'],
      ['id', 'Indonesia'],
      ['th', 'Thái Lan'],
      ['ms', 'Malaysia'],
      ['en-SG', 'Singapore'],
      ['fil', 'Philippines'],
      ['km', 'Campuchia'],
      ['lo', 'Lào'],
      ['my', 'Myanmar'],
      ['ms-BN', 'Brunei'],
    ]);
    expect(localeCountry('en')).toBe('Anh');
    expect(localeCountry('zh')).toBe('Trung Quốc');
    expect(localeCountry('en-SG')).toBe('Singapore');
    expect(localeCountry('unknown')).toBe('Việt Nam');
  });
});

describe('D-89 nhóm ngành (prototype v4)', () => {
  it('56 nhóm ngành g1…g56, mỗi nhóm có nhóm tỉnh cha; tổng 90 nhóm', async () => {
    const { communities, industryGroups } = await import('./index');
    expect(industryGroups).toHaveLength(56);
    expect(communities.length + industryGroups.length).toBe(90);
    expect(industryGroups[0]).toMatchObject({
      id: 'g1',
      name: 'OPC Hà Nội – Công nghệ & AI',
      parent: 'c1',
      members: 275,
      weekly: 110,
    });
    const ids = new Set(communities.map((c) => c.id));
    expect(industryGroups.every((g) => ids.has(g.parent))).toBe(true);
  });
});
