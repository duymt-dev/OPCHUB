import type { RequesterProfile } from '@opchub/shared/api-domains';
import { describe, expect, it } from 'vitest';
import { firstError, initialForm, toRequest } from './model';

const biz: RequesterProfile = {
  fullName: 'Nguyễn Văn An',
  email: 'an.nguyen@mediasoft.vn',
  accountType: 'business',
  phone: { country: 'vn', number: '912 345 678' },
  business: { taxCode: '0101234567', companyName: 'Công ty TNHH Giải pháp MediaSoft' },
};

describe('services/model', () => {
  it('TK doanh nghiệp: mở sẵn biến thể DN, điền tổ chức + MST + SĐT có mã nước', () => {
    const f = initialForm('ai30', biz);
    expect(f).toMatchObject({
      kind: 'biz',
      org: 'Công ty TNHH Giải pháp MediaSoft',
      tax: '0101234567',
      phone: '+84 912 345 678',
    });
  });

  it('kiểm lần lượt như prototype: loại hình → tỉnh → mô tả', () => {
    const f = initialForm('ai30', biz);
    expect(firstError(f)).toBe('orgType');
    expect(firstError({ ...f, orgType: 'Doanh nghiệp' })).toBe('addr');
    expect(firstError({ ...f, orgType: 'Doanh nghiệp', addr: 'Hà Nội' })).toBe('note');
    const ok = { ...f, orgType: 'Doanh nghiệp', addr: 'Hà Nội', note: '<p>Cần tư vấn</p>' };
    expect(firstError(ok)).toBeNull();
    expect(firstError({ ...ok, kind: 'per' })).toBe('job');
    expect(firstError({ ...ok, phone: '12' })).toBe('phone');
  });

  it('gửi: chỉ trường đúng biến thể, thông tin thêm có nhãn', () => {
    const f = {
      ...initialForm('ai30', biz),
      kind: 'per' as const,
      job: 'Freelancer',
      orgType: 'Doanh nghiệp',
      budget: 'Dưới 10 triệu',
      addr: 'Hà Nội',
      note: '<p>x</p>',
    };
    const r = toRequest(f);
    expect(r).toMatchObject({ requesterType: 'personal', organization: '', taxCode: '' });
    expect(r.details).toEqual({
      'Nghề nghiệp / vai trò': 'Freelancer',
      'Ngân sách dự kiến': 'Dưới 10 triệu',
    });
  });
});
