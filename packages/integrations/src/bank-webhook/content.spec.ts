import { describe, expect, it } from 'vitest';
import { extractFundraisingCode, extractMemberCode, parsePaymentContent } from './content';
import { signBody, verifySignature } from './signature';

describe('extractMemberCode — gợi ý cho kế toán (BUG-014)', () => {
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

describe('extractFundraisingCode — gợi ý mã GV', () => {
  it.each([
    ['OPCHUB GV000001', 'GV000001'],
    ['opchubgv000001 0912345678', 'GV000001'],
    ['OPC M1 GV-000042', 'GV000042'],
    ['GV000001 GV000002', null],
    ['AGV000001', null],
  ])('%s → %s', (content, code) => {
    expect(extractFundraisingCode(content)).toBe(code);
  });
});

describe('parsePaymentContent — §28.1 BR-PAY-REF (D-104, D-105)', () => {
  it.each([
    ['OPCHUB TV000123 0912345678', { kind: 'member', code: 'TV000123' }],
    ['opchub tv000123', { kind: 'member', code: 'TV000123' }],
    ['  OPCHUB   TV000123  ', { kind: 'member', code: 'TV000123' }],
    // Ngân hàng chèn mã giao dịch phía trước (Q-V42-704-1)
    ['MBVCB.123456 OPCHUB TV000123 0912345678', { kind: 'member', code: 'TV000123' }],
    [
      'OPCHUB TV000123 0912345678 GV000001',
      { kind: 'fundraising', code: 'GV000001', memberCode: 'TV000123' },
    ],
    ['OPCHUB TV000123 GV000001', { kind: 'fundraising', code: 'GV000001', memberCode: 'TV000123' }],
  ])('%s', (content, want) => {
    expect(parsePaymentContent(content)).toEqual(want);
  });

  const NO_PREFIX = 'Nội dung không bắt đầu bằng OPCHUB';
  const NO_TV = 'Không tìm thấy Mã TV trong nội dung';
  const BAD = 'Nội dung không đúng mẫu OPCHUB [Mã TV] [SĐT] [GV]';
  it.each([
    ['TV000123 0912345678', NO_PREFIX],
    ['CK OPCHUBTV000123', NO_PREFIX],
    ['MBVCB.123456.OPCHUB TV000123', NO_PREFIX],
    ['chuyen tien', NO_PREFIX],
    ['', NO_PREFIX],
    ['OPCHUB 0912345678', NO_TV],
    ['OPCHUB TV00012', NO_TV],
    ['OPCHUB TV-000123', NO_TV],
    ['OPCHUB GV000001', NO_TV],
    ['OPCHUB TV000123 TV000456', BAD],
    ['OPCHUB TV000123 0912345678 GV000001 GV000002', BAD],
    ['OPCHUB TV000123 thanh toan phi', BAD],
    ['OPCHUB TV000123 0912345678 GV10-11-12', BAD],
  ])('%s → %s', (content, reason) => {
    expect(parsePaymentContent(content)).toEqual({ kind: 'invalid', reason });
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
