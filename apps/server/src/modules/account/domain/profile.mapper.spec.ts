import { describe, expect, it } from 'vitest';
import { splitPhone, toPatch } from './profile.mapper';

describe('profile mapper', () => {
  it('tách E.164 theo mã quốc gia dài nhất', () => {
    expect(splitPhone('+84912345678', 'vn')).toEqual({ country: 'vn', number: '912345678' });
    expect(splitPhone('+855123456', 'vn')).toEqual({ country: 'kh', number: '123456' });
    expect(splitPhone(null, 'th')).toEqual({ country: 'th', number: '' });
  });

  it('PATCH chỉ chứa trường đã gửi; persona nhãn → id; DN field → main_field', () => {
    const { user, biz } = toPatch({
      email: 'AN@X.VN',
      persona: 'Chuyên gia',
      business: { field: 'Phần mềm' },
    });
    expect(user).toEqual({ email: 'an@x.vn', registrationRole: 'expert' });
    expect(biz).toEqual({ mainField: 'Phần mềm' });
    expect(toPatch({ city: 'Huế' }).biz).toBeNull();
  });
});
