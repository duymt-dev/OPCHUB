import type { StoreUpsert } from '@opchub/shared/api-domains';
import { describe, expect, it } from 'vitest';
import { storeQuery } from './api';
import {
  completeness,
  formatPrice,
  parsePrice,
  storeInitials,
  telLink,
  webLink,
  zaloLink,
} from './model';

const base: StoreUpsert = {
  name: 'HTX Cà phê Hòa Phú',
  slogan: '',
  audience: 'organization',
  field: '',
  province: '',
  intro: '',
  coverUrl: null,
  phone: '',
  email: '',
  website: '',
  address: '',
  items: [],
};

describe('stores model (V4-608)', () => {
  it('mức hoàn thiện 5 mục như prototype', () => {
    expect(completeness(base).pct).toBe(0);
    const full = completeness({
      ...base,
      slogan: 'Robusta',
      intro: 'x'.repeat(40),
      coverUrl: 'https://cdn/x.webp',
      phone: '+84 912 345 678',
      address: 'Đắk Lắk',
      items: [{ kind: 'product', name: 'Cà phê', price: null, description: '', imageUrl: null }],
    });
    expect(full.pct).toBe(100);
    expect(completeness({ ...base, slogan: 'a', intro: 'x'.repeat(39) }).pct).toBe(20);
  });

  it('liên hệ: Zalo theo số nội địa, tel giữ dấu +, ẩn khi thiếu số', () => {
    expect(zaloLink('+84 912 345 678')).toBe('https://zalo.me/0912345678');
    expect(zaloLink('0912.345.678')).toBe('https://zalo.me/0912345678');
    expect(zaloLink('')).toBeNull();
    expect(telLink('+84 912 345 678')).toBe('tel:+84912345678');
    expect(telLink('12')).toBeNull();
    expect(webLink('mediasoft.vn')).toBe('https://mediasoft.vn');
    expect(webLink('')).toBeNull();
  });

  it('giá: trống / 0 → Liên hệ báo giá', () => {
    expect(parsePrice('8.900.000')).toBe(8_900_000);
    expect(parsePrice('')).toBeNull();
    expect(formatPrice(null)).toBeNull();
    expect(formatPrice(250000)).toBe('250.000đ');
  });

  it('chữ viết tắt bỏ loại hình pháp lý', () => {
    expect(storeInitials('Công ty TNHH Giải pháp MediaSoft')).toBe('MS');
    expect(storeInitials('HTX Cà phê Hòa Phú')).toBe('CP');
  });

  it('query string khớp storeListQuerySchema', () => {
    const qs = storeQuery({
      q: ' cà phê ',
      kind: 'product',
      audience: ['business', 'student'],
      field: ['Thủy sản'],
      province: [],
      sort: 'name',
      page: 2,
    });
    const p = new URLSearchParams(qs);
    expect(Object.fromEntries(p)).toEqual({
      sort: 'name',
      page: '2',
      q: 'cà phê',
      kind: 'product',
      audience: 'business,student',
      field: 'Thủy sản',
    });
  });
});
