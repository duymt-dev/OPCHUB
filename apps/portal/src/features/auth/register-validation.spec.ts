import { describe, expect, it } from 'vitest';
import { REGISTER_FIELD_MAP, validateBusiness, validatePersonal } from './register-validation';

describe('register-validation (D-89 v4)', () => {
  it('UAT-01 BUG-022 REQ-382 đăng ký cá nhân trống → email, đồng ý cùng lúc (không còn vai trò / nhóm)', () => {
    const e = validatePersonal({ email: '', agree: false });
    expect(e).toEqual({ email: 'errEmail', agree: 'errAgree' });
    expect(validatePersonal({ email: 'a@b.vn', agree: true })).toEqual({});
  });

  it('UAT-01 BUG-022 đăng ký DN trống → người đại diện, email, đồng ý; thứ tự như prototype', () => {
    const e = validateBusiness({ representative: '  ', email: 'sai', agree: false });
    expect(Object.keys(e)).toEqual(['rep', 'email', 'agree']);
    expect(e.rep).toBe('errRep');
    expect(
      validateBusiness({ representative: 'Nguyễn Văn An', email: 'a@b.vn', agree: true }),
    ).toEqual({});
  });

  it('lỗi server representative → ô người đại diện', () => {
    expect(REGISTER_FIELD_MAP.representative).toBe('rep');
  });
});
