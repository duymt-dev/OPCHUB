import { describe, expect, it } from 'vitest';
import { validateBusiness, validatePersonal } from './register-validation';

describe('register-validation', () => {
  it('UAT-01 BUG-022 đăng ký cá nhân trống → vai trò, nhóm, email cùng lúc', () => {
    const e = validatePersonal({ persona: '', groupIds: [], email: '' });
    expect(e).toEqual({ persona: 'errPersona', groups: 'errGroups', email: 'errEmail' });
    expect(Object.keys(e)).toEqual(['persona', 'groups', 'email']);
    expect(validatePersonal({ persona: 'expert', groupIds: ['c1'], email: 'a@b.vn' })).toEqual({});
  });

  it('UAT-01 BUG-022 đăng ký DN trống → MST, tên DN, ngành, nhóm, email cùng lúc', () => {
    const e = validateBusiness({
      tax: '',
      companyName: '',
      mainIndustry: '',
      groupIds: [],
      email: '',
    });
    expect(Object.keys(e)).toEqual(['tax', 'company', 'industry', 'groups', 'email']);
    expect(e.tax).toBe('errTaxEmpty');
    expect(
      validateBusiness({
        tax: '123',
        companyName: 'A',
        mainIndustry: 'B',
        groupIds: ['c1'],
        email: 'a@b.vn',
      }),
    ).toEqual({ tax: 'errTax' });
  });
});
