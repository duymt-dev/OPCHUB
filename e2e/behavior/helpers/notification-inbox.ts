import { loginResponseSchema } from '@opchub/shared/api';
import {
  notificationListSchema,
  notificationReadResultSchema,
  onboardingAutoRemindSchema,
} from '@opchub/shared/api-domains';
import type { APIRequestContext } from '@playwright/test';
import { expect } from '../../server/test';
import { onServer } from '../../server/api';
import { env } from '../../env';

/** Inbox mechanics start after today's legitimate onboarding reminder has already been read. */
export async function prepareNotificationInbox(request: APIRequestContext) {
  if (!onServer) return;
  const target = new URL(env.API_PROXY_URL);
  if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.port !== '4310')
    throw new Error('Notification inbox prerequisite requires the isolated TIP-812 API');
  const api = `${env.API_PROXY_URL}/v1`;
  const login = await request.post(`${api}/auth/login`, {
    data: { identifier: 'an.nguyen@mediasoft.vn', password: 'User@2026' },
  });
  expect(login.status()).toBe(200);
  const { accessToken } = loginResponseSchema.parse(await login.json());
  const headers = { authorization: `Bearer ${accessToken}` };
  const list = async () => {
    const response = await request.get(`${api}/notifications?size=50`, { headers });
    expect(response.status()).toBe(200);
    return notificationListSchema.parse(await response.json());
  };
  const before = await list();
  expect(before.unread).toBe(2);
  const reminder = await request.post(`${api}/me/onboarding/auto-remind`, { headers });
  expect(reminder.status()).toBe(200);
  expect(onboardingAutoRemindSchema.parse(await reminder.json()).reminded).toBe(true);
  const after = await list();
  const added = after.items.filter((item) => !before.items.some((old) => old.id === item.id));
  expect(added).toHaveLength(1);
  expect(added[0]?.type).toBe('system');
  const read = await request.post(`${api}/notifications/read`, {
    headers,
    data: { ids: added.map((item) => item.id) },
  });
  expect(read.status()).toBe(200);
  expect(notificationReadResultSchema.parse(await read.json()).unread).toBe(2);
  const repeated = await request.post(`${api}/me/onboarding/auto-remind`, { headers });
  expect(repeated.status()).toBe(200);
  expect(onboardingAutoRemindSchema.parse(await repeated.json()).reminded).toBe(false);
}
