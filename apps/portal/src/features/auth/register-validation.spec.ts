import { describe, expect, it } from 'vitest';
import { validateBusiness, validatePersonal } from './register-validation';

describe('register-validation', () => {
  it('UAT-01 BUG-022 REQ-382 đăng ký cá nhân trống → vai trò, nhóm, email, đồng ý cùng lúc', () => {
    const e = validatePersonal({ persona: '', groupIds: [], email: '', agree: false });
    expect(e).toEqual({
      persona: 'errPersona',
      groups: 'errGroups',
      email: 'errEmail',
      agree: 'errAgree',
    });
    expect(Object.keys(e)).toEqual(['persona', 'groups', 'email', 'agree']);
    expect(
      validatePersonal({ persona: 'expert', groupIds: ['c1'], email: 'a@b.vn', agree: true }),
    ).toEqual({});
  });

  it('UAT-01 BUG-022 REQ-382 đăng ký DN trống → MST, tên DN, ngành, nhóm, email, đồng ý cùng lúc', () => {
    const e = validateBusiness({
      tax: '',
      companyName: '',
      mainIndustry: '',
      groupIds: [],
      email: '',
      agree: false,
    });
    expect(Object.keys(e)).toEqual(['tax', 'company', 'industry', 'groups', 'email', 'agree']);
    expect(e.tax).toBe('errTaxEmpty');
    expect(
      validateBusiness({
        tax: '123',
        companyName: 'A',
        mainIndustry: 'B',
        groupIds: ['c1'],
        email: 'a@b.vn',
        agree: true,
      }),
    ).toEqual({ tax: 'errTax' });
  });
});
