import { describe, expect, it } from 'vitest';
import { maskPii } from './mask-pii';
describe('REQ-628 outbound PII masking', () => {
  it('masks phone/email/account numbers but keeps member codes', () => {
    expect(maskPii('0912 345 678 +84912345678 a.b@x.vn 1203132809 TV000123')).toBe(
      '[SĐT] [SĐT] [email] [STK] TV000123',
    );
  });
  it('does not damage UUIDs, short numbers or letters embedded in identifiers', () => {
    expect(maskPii('TV000123 item123456789 2026 123')).toBe('TV000123 item123456789 2026 123');
    const id = '00000000-0000-4000-8000-123456789012';
    expect(maskPii(`${id} 1203132809 a.b@x.vn`)).toBe(`${id} [STK] [email]`);
  });
});
