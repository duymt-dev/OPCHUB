import { describe, expect, it } from 'vitest';
import { extractMemberCode, extractPaymentCode } from './content';
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

describe('extractPaymentCode (V4-610)', () => {
  it.each([
    ['OPCHUB GV000001', { kind: 'fundraising', code: 'GV000001', memberCode: null }],
    ['opchubgv000001 0912345678', { kind: 'fundraising', code: 'GV000001', memberCode: null }],
    ['OPC M1 GV-000042', { kind: 'fundraising', code: 'GV000042', memberCode: null }],
    ['OPCHUB TV000123', { kind: 'member', code: 'TV000123' }],
    // D-105 (B3): mẫu §28.1 có cả TV và GV → ưu tiên GV, giữ Mã TV để kiểm chủ khoản
    [
      'OPCHUB TV000123 0912345678 GV000001',
      { kind: 'fundraising', code: 'GV000001', memberCode: 'TV000123' },
    ],
  ])('%s', (content, want) => {
    expect(extractPaymentCode(content)).toEqual(want);
  });

  it.each([
    'OPCHUB TV000123 TV000456 GV000001',
    'GV000001 GV000002',
    'AGV000001',
    'GV00001',
    'chuyen tien',
  ])('%s → null', (content) => {
    expect(extractPaymentCode(content)).toBeNull();
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
