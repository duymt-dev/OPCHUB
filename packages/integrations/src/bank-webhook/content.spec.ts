import { describe, expect, it } from 'vitest';
import { extractMemberCode } from './content';
import { signBody, verifySignature } from './signature';

describe('extractMemberCode (D-41)', () => {
  it.each([
    ['OPCHUB TV000123 0912345678', 'TV000123'],
    ['opchub tv000123', 'TV000123'],
    ['OPCHUBTV000123', 'TV000123'],
    ['MBVCB.123456.OPCHUB TV000123 0912345678.CT tu 0011', 'TV000123'],
    ['IBFT OPCHUB  TV 000123', 'TV000123'],
    ['opchub tv-000123 thanh toan phi', 'TV000123'],
    ['TV000123', 'TV000123'],
    ['  tv000123.', 'TV000123'],
  ])('%s → %s', (content, code) => {
    expect(extractMemberCode(content)).toBe(code);
  });

  it.each([
    ['OPCHUB 0912345678'],
    ['OPCHUB TV00012'],
    ['OPCHUB TV0001234'],
    ['ATV000123'],
    ['OPCHUB TV000123 TV000456'],
    [''],
  ])('%s → null', (content) => {
    expect(extractMemberCode(content)).toBeNull();
  });

  it('cùng mã lặp lại vẫn khớp', () => {
    expect(extractMemberCode('TV000123 OPCHUB TV000123')).toBe('TV000123');
  });
});

describe('HMAC', () => {
  const body = Buffer.from('{"id":1}');
  it('đúng chữ ký → true, sai 1 ký tự → false, thiếu → false', () => {
    const sig = signBody('s3cret', body);
    expect(verifySignature('s3cret', body, sig)).toBe(true);
    const bad = (sig[0] === 'a' ? 'b' : 'a') + sig.slice(1);
    expect(verifySignature('s3cret', body, bad)).toBe(false);
    expect(verifySignature('s3cret', body, undefined)).toBe(false);
    expect(verifySignature('s3cret', body, 'zz')).toBe(false);
  });
});
