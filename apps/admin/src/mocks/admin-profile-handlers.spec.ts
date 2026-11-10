import { adminLoginResponseSchema, adminMeSchema, apiErrorSchema } from '@opchub/shared/api';
import { resetMockDb, mockAdminMeOf } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const base = location.origin + '/v1/admin/auth';
const send = (path: string, body: unknown, method = 'POST', auth = 'Bearer mock.admin') =>
  fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify(body),
  });
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => resetMockDb());
afterAll(() => server.close());

it('TIP-V46-822 AC-02 self update/GET agree; unknown account and role/email rejected', async () => {
  expect((await send('/me', { name: 'Name' }, 'PATCH', '')).status).toBe(401);
  expect((await send('/me', { name: 'Name' }, 'PATCH', 'Bearer mock.unknown')).status).toBe(401);
  expect((await send('/me', { name: 'Name', email: 'x@x.vn' }, 'PATCH')).status).toBe(400);
  const updated = await send('/me', { name: 'Trần Quản Trị', phone: '' }, 'PATCH');
  expect(updated.status).toBe(200);
  const me = adminMeSchema.parse(await updated.json());
  expect(me).toMatchObject({ name: 'Trần Quản Trị', phone: null });
  expect(mockAdminMeOf('admin')).toEqual(me);
});
it('TIP-V46-822 AC-05 errors and successful password session use shared contracts', async () => {
  for (const [body, field] of [
    [
      { currentPassword: 'wrong', newPassword: 'NewPass1', confirmPassword: 'NewPass1' },
      'currentPassword',
    ],
    [
      { currentPassword: 'Admin@2026', newPassword: 'weak', confirmPassword: 'weak' },
      'newPassword',
    ],
    [
      { currentPassword: 'Admin@2026', newPassword: 'Admin@2026', confirmPassword: 'Admin@2026' },
      'newPassword',
    ],
    [
      { currentPassword: 'Admin@2026', newPassword: 'NewPass1', confirmPassword: 'OtherPass2' },
      'confirmPassword',
    ],
  ] as const) {
    const response = await send('/change-password', body);
    expect(response.status).toBe(400);
    expect(
      apiErrorSchema
        .parse(await response.json())
        .error.fields?.some((entry) => entry.path === field),
    ).toBe(true);
  }
  const response = await send('/change-password', {
    currentPassword: 'Admin@2026',
    newPassword: 'NewPass1',
    confirmPassword: 'NewPass1',
  });
  expect(response.status).toBe(200);
  expect(adminLoginResponseSchema.parse(await response.json()).admin.id).toBe('admin');
});
it('TIP-V46-822 AC-03 mock rejects external/missing avatars like native', async () => {
  for (const avatarUrl of [
    'https://other.test/image.png',
    location.origin + '/v1/uploads/avatar-missing',
  ]) {
    expect((await send('/me', { name: 'Name', avatarUrl }, 'PATCH')).status).toBe(400);
  }
});
