import { test, expect } from '@playwright/test';
import { AuthProtocol } from './protocol';

for (const path of [
  '/v1/admin/settings/general',
  '/v1/admin/admin-accounts/existing/status',
  '/v1/admin/admin-accounts/existing/role',
  '/v1/admin/auth/first-password',
])
  test(`D-141 AC824-04 fixture guard rejects unowned mutation ${path}`, () => {
    const guard = new AuthProtocol();
    guard.request('POST', path, {});
    expect(guard.errors.length).toBeGreaterThan(0);
  });
test('D-141 AC824-04 fixture guard rejects existing identity and malformed401', () => {
  const guard = new AuthProtocol();
  expect(() =>
    guard.register({
      email: 'existing@example.invalid',
      name: 'existing',
      password: '',
      nextPassword: '',
      roleId: 'untouched',
    }),
  ).toThrow('Refusing non-owned auth fixture');
  guard.response('/v1/admin/auth/login', 401, { error: { code: 'UNAUTHORIZED', message: 'raw' } });
  expect(guard.errors).toContain('Unexpected login401 or malformed MFA challenge');
});
