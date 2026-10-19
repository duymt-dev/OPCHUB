import type { AdminMe } from '@opchub/shared/api';
import { describe, expect, it } from 'vitest';
import { setupRouteOf } from './setup-route';

const me = (o: Partial<AdminMe>): AdminMe => ({
  id: 'a',
  name: 'A',
  email: 'a@x.vn',
  roleId: 'r',
  roleName: 'Giảng viên',
  isSuperAdmin: false,
  permissions: [],
  mustChangePassword: false,
  twoFactor: false,
  twoFactorRequired: false,
  ...o,
});

describe('SEC-R01/R02 thứ tự màn thiết lập', () => {
  it('MK tạm trước, rồi 2FA, xong → null', () => {
    expect(setupRouteOf(me({ mustChangePassword: true, twoFactorRequired: true }))).toBe(
      '/first-password',
    );
    expect(setupRouteOf(me({ twoFactorRequired: true }))).toBe('/two-factor');
    expect(setupRouteOf(me({}))).toBeNull();
  });
});
