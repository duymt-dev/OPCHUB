import { describe, expect, it } from 'vitest';
import { availableStoreSlug, storeSlugBase } from './store-slug';

describe('BR-494 slug', () => {
  it.each([
    ['HTX Cà phê Hòa Phú', 'htx-ca-phe-hoa-phu'],
    ['Đặc sản Đà Lạt!!', 'dac-san-da-lat'],
    ['!!!', 'gian-hang'],
    ['a'.repeat(59) + ' ' + 'b'.repeat(40), 'a'.repeat(59)],
  ])('%s', (name, slug) => expect(storeSlugBase(name)).toBe(slug));
  it('chooses the smallest available suffix, not count + 1', () => {
    expect(availableStoreSlug('ca-phe', ['ca-phe', 'ca-phe-3'])).toBe('ca-phe-2');
    expect(availableStoreSlug('ca-phe', [])).toBe('ca-phe');
  });
});
