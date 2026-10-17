import { meSchema } from '@opchub/shared/api';
import { describe, expect, it } from 'vitest';
import { type SessionUser, toClaims, toMe } from './me.mapper';

const user: SessionUser = {
  id: 'm1',
  memberCode: 'TV000001',
  fullName: 'Nguyễn Văn An',
  email: 'an@x.vn',
  accountType: 'business',
  systemRole: 'member',
  status: 'active',
  avatarUrl: null,
  permVersion: 3,
  mustChangePassword: false,
};
const fee = {
  status: 'active' as const,
  validUntil: new Date('2027-03-02T00:00:00Z'),
  amount: 600000,
};

describe('toMe', () => {
  it('khớp meSchema, transferRef theo Mã TV', () => {
    const me = meSchema.parse(toMe(user, fee));
    expect(me.membershipFee?.transferRef).toBe('OPCHUB TV000001');
    expect(me.membershipFee?.validUntil).toBe('2027-03-02T00:00:00.000Z');
  });

  it('nhà đầu tư không có phí (D-14)', () => {
    expect(toMe({ ...user, accountType: 'investor' }, fee).membershipFee).toBeNull();
  });

  it('claim mang permVersion + phí', () => {
    const c = toClaims(user, fee);
    expect(c).toMatchObject({ sub: 'm1', permVersion: 3, membershipFee: { status: 'active' } });
  });
});
