import type { RequesterProfile } from '@opchub/shared/api-domains';
import { describe, expect, it } from 'vitest';
import { consultErrors, firstError, initialForm, toRequest } from './model';

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

  it('kiểm lần lượt: loại hình → quy mô → chức vụ → tỉnh → mô tả; cá nhân cần nghề nghiệp', () => {
    const f = initialForm('ai30', biz);
    expect(firstError(f)).toBe('orgType');
    const typed = { ...f, orgType: 'Doanh nghiệp' };
    expect(firstError(typed)).toBe('size');
    const sized = { ...typed, size: '1 – 10 người', pos: 'Giám đốc' };
    expect(firstError(sized)).toBe('addr');
    expect(firstError({ ...sized, addr: 'Hà Nội' })).toBe('note');
    const ok = { ...sized, addr: 'Hà Nội', note: '<p>Cần tư vấn</p>' };
    expect(firstError(ok)).toBeNull();
    expect(firstError({ ...ok, kind: 'per' })).toBe('job');
    expect(firstError({ ...ok, kind: 'per', job: 'Freelancer' })).toBeNull();
    expect(firstError({ ...ok, phone: '12' })).toBe('phone');
    expect(firstError({ ...ok, note: '<p>&nbsp;</p>' })).toBe('note');
  });

  it('QT-11 UAT-21 thứ tự kiểm DN: org → orgType → tax → size → pos', () => {
    const empty = { ...initialForm('ai30', biz), org: '', tax: '', addr: 'Hà Nội', note: 'x' };
    expect(firstError(empty)).toBe('org');
    const a = { ...empty, org: 'MediaSoft' };
    expect(firstError(a)).toBe('orgType');
    const b = { ...a, orgType: 'Doanh nghiệp' };
    expect(firstError(b)).toBe('tax');
    expect(firstError({ ...b, tax: '010123456' })).toBe('tax');
    const c = { ...b, tax: '0101234567-001' };
    expect(firstError(c)).toBe('size');
    const d = { ...c, size: '11 – 50 người' };
    expect(firstError(d)).toBe('pos');
    expect(firstError({ ...d, pos: '  ' })).toBe('pos');
    expect(firstError({ ...d, pos: 'Giám đốc' })).toBeNull();
  });

  it('UAT-21 consultErrors DN thiếu tên DN + loại hình', () => {
    const f = { ...initialForm('ai30', biz), org: '', addr: 'Hà Nội', note: 'x' };
    const e = consultErrors(f);
    expect(Object.keys(e)).toEqual(['org', 'orgType', 'size', 'pos']);
    expect(e.org).toBe('org');
    expect(e.orgType).toBe('orgType');
  });

  it('BUG-022 consultErrors cá nhân trống → đánh dấu mọi ô bắt buộc cùng lúc', () => {
    const f = { ...initialForm('ai30', undefined), kind: 'per' as const };
    expect(Object.keys(consultErrors(f))).toEqual([
      'name',
      'phone',
      'email',
      'job',
      'addr',
      'note',
    ]);
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

  it('REQ-408 gửi DN: nhãn chuẩn SERVICE_DETAIL_LABELS, không kèm trường cá nhân', () => {
    const f = {
      ...initialForm('ai30', biz),
      orgType: 'Doanh nghiệp',
      size: '1 – 10 người',
      pos: 'Giám đốc',
      job: 'Freelancer',
      addr: 'Hà Nội',
      note: '<p>x</p>',
    };
    expect(toRequest(f)).toMatchObject({
      requesterType: 'business',
      taxCode: '0101234567',
      details: {
        'Loại hình': 'Doanh nghiệp',
        'Quy mô nhân sự': '1 – 10 người',
        'Chức vụ người liên hệ': 'Giám đốc',
      },
    });
    expect(toRequest(f).details).not.toHaveProperty('Nghề nghiệp / vai trò');
  });
});
