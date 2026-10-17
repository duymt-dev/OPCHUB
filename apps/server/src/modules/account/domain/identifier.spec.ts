import { describe, expect, it } from 'vitest';
import { normalizePhone, parseIdentifier } from './identifier';

describe('parseIdentifier', () => {
  it('email viết hoa → chữ thường', () => {
    expect(parseIdentifier(' An.Nguyen@MediaSoft.vn ')).toEqual({
      kind: 'email',
      email: 'an.nguyen@mediasoft.vn',
    });
  });

  it.each([
    ['0912 345 678', '+84912345678'],
    ['+84 912 345 678', '+84912345678'],
    ['84912345678', '+84912345678'],
    ['+66 81 234 5678', '+66812345678'],
  ])('SĐT %s → %s', (raw, e164) => {
    expect(parseIdentifier(raw)).toEqual({ kind: 'phone', phone: e164 });
  });

  it('chuỗi rác → null', () => {
    expect(parseIdentifier('abc')).toBeNull();
    expect(normalizePhone('123')).toBeNull();
  });
});
