import { describe, expect, it } from 'vitest';
import { localPhone, transferContentOf } from './transfer-content';

describe('Nội dung CK §28.1 (D-104, D-105)', () => {
  it('SĐT chuẩn hoá 10 số bắt đầu bằng 0', () => {
    expect(localPhone('+84912345678')).toBe('0912345678');
    expect(localPhone('84912345678')).toBe('0912345678');
    expect(localPhone('0912345678')).toBe('0912345678');
    expect(localPhone(null)).toBe('');
  });

  it('phí thành viên / Gói Gọi vốn; thiếu SĐT bỏ token', () => {
    expect(transferContentOf('TV000001', '+84912345678')).toBe('OPCHUB TV000001 0912345678');
    expect(transferContentOf('TV000001', '+84912345678', 'GV000010')).toBe(
      'OPCHUB TV000001 0912345678 GV000010',
    );
    expect(transferContentOf('TV000001', null, 'GV000010')).toBe('OPCHUB TV000001 GV000010');
  });
});
