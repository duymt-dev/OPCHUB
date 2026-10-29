import { describe, expect, it } from 'vitest';
import { crc16, qrPurpose, vietQrPayload } from './vietqr';

/** Đọc TLV EMVCo thành map id → value (một cấp) */
function parse(s: string): Map<string, string> {
  const out = new Map<string, string>();
  let i = 0;
  while (i < s.length) {
    const id = s.slice(i, i + 2);
    const len = Number(s.slice(i + 2, i + 4));
    out.set(id, s.slice(i + 4, i + 4 + len));
    i += 4 + len;
  }
  return out;
}

describe('VietQR EMVCo (D-96)', () => {
  it('CRC-16/CCITT-FALSE: vector chuẩn "123456789" = 29B1', () => {
    expect(crc16('123456789')).toBe('29B1');
  });

  it('phí 1.200.000đ: các trường 00/01/38/53/54/58/62/63 đúng, CRC tự kiểm', () => {
    const qr = vietQrPayload({
      bin: '970436',
      accountNo: '1203132809',
      amount: 1_200_000,
      purpose: 'OPCHUB TV000001 0912345678',
    });
    const f = parse(qr);
    expect(f.get('00')).toBe('01');
    expect(f.get('01')).toBe('12');
    const m = parse(f.get('38') ?? '');
    expect(m.get('00')).toBe('A000000727');
    expect(parse(m.get('01') ?? '')).toEqual(
      new Map([
        ['00', '970436'],
        ['01', '1203132809'],
      ]),
    );
    expect(m.get('02')).toBe('QRIBFTTA');
    expect(f.get('53')).toBe('704');
    expect(f.get('54')).toBe('1200000');
    expect(f.get('58')).toBe('VN');
    expect(parse(f.get('62') ?? '').get('08')).toBe('OPCHUB TV000001 0912345678');
    expect(qr.slice(-8, -4)).toBe('6304');
    expect(qr.slice(-4)).toBe(crc16(qr.slice(0, -4)));
  });

  it('nội dung bỏ dấu, chỉ ASCII, tối đa 99 ký tự', () => {
    expect(qrPurpose('Đóng phí thành viên')).toBe('Dong phi thanh vien');
    expect(qrPurpose('x'.repeat(120))).toHaveLength(99);
  });
});
