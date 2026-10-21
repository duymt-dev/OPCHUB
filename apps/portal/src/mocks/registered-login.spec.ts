import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { loginResponseSchema } from '@opchub/shared/api';
import { captureCommunitySnapshot } from '@opchub/shared/mock-domains';

const server = setupServer(...handlers);
const base = `${location.origin}/v1`;
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterAll(() => server.close());
const post = (path: string, body: unknown) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

it('UAT-30 REQ-401 correct OTP alone promotes the private password verifier; same identity logs in', async () => {
  const email = 'handler-fresh@example.test';
  const password = 'SyntheticExample42!';
  const input = {
    email,
    password,
    fullName: 'Handler Fresh',
    phone: { country: 'vn', number: '0912345678' },
    persona: 'expert',
    groupIds: ['c1'],
    agreeTerms: true,
  };
  expect((await post('/auth/register/personal', input)).status).toBe(202);
  const login = () => post('/auth/login', { identifier: email, password });
  expect((await login()).status).toBe(401);
  expect((await post('/auth/otp/verify', { email, code: '000000' })).status).toBe(422);
  expect((await login()).status).toBe(401);
  const accepted = await post('/auth/otp/verify', { email, code: '123456' });
  expect(accepted.status).toBe(200);
  const first = loginResponseSchema.parse(await accepted.json());
  expect(first.me.membershipFee?.transferRef).toMatch(/^OPCHUB TV\d{6}$/);
  expect((await post('/auth/otp/verify', { email, code: '123456' })).status).toBe(422);
  expect((await post('/auth/logout', {})).status).toBe(204);
  expect(
    (await post('/auth/login', { identifier: email, password: 'WrongExample42!' })).status,
  ).toBe(401);
  const response = await login();
  expect(response.status).toBe(200);
  const second = loginResponseSchema.parse(await response.json());
  expect(second.me).toEqual(first.me);
  expect(JSON.stringify(captureCommunitySnapshot())).not.toMatch(
    /SyntheticExample42|verifier|password|salt/,
  );
});
