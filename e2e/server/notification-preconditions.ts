import { loginResponseSchema } from '@opchub/shared/api';
import {
  notificationListSchema,
  notificationReadResultSchema,
  onboardingAutoRemindSchema,
  onboardingAutoRemindTitle,
  onboardingSchema,
} from '@opchub/shared/api-domains';
import { env } from '../env';

const API = `${env.API_PROXY_URL}/v1`;

async function call(path: string, token?: string, body?: unknown): Promise<unknown> {
  const response = await fetch(`${API}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) throw new Error(`Notification fixture ${path}: HTTP ${response.status}`);
  return response.json();
}

/**
 * REQ-210 tests start with two seeded unread notices. MSW's demo has already
 * consumed today's D-115 reminder. Native performs that real action before
 * login and reads ONLY that reminder, preserving both original unread notices.
 * No notification deletion, disabled reminder, altered count or UI assertion.
 */
export async function prepareSeededNotificationInbox(): Promise<void> {
  if (env.E2E_TARGET !== 'server') return;
  const { accessToken } = loginResponseSchema.parse(
    await call('/auth/login', undefined, {
      identifier: 'an.nguyen@mediasoft.vn',
      password: 'User@2026',
    }),
  );
  const state = onboardingSchema.parse(await call('/me/onboarding', accessToken));
  if (state.done === state.total) throw new Error('Expected incomplete demo onboarding');
  onboardingAutoRemindSchema.parse(await call('/me/onboarding/auto-remind', accessToken, {}));
  const title = onboardingAutoRemindTitle(state.total - state.done);
  const before = notificationListSchema.parse(await call('/notifications?size=50', accessToken));
  const reminders = before.items.filter(
    (item) => item.type === 'system' && item.link === '/dashboard' && item.title === title,
  );
  if (reminders.length !== 1) throw new Error('Expected exactly one real daily demo reminder');
  notificationReadResultSchema.parse(
    await call('/notifications/read', accessToken, { ids: reminders.map((item) => item.id) }),
  );
  const repeated = onboardingAutoRemindSchema.parse(
    await call('/me/onboarding/auto-remind', accessToken, {}),
  );
  if (repeated.reminded) throw new Error('Daily reminder unexpectedly repeated during setup');
  const after = notificationListSchema.parse(await call('/notifications?size=50', accessToken));
  const unreadIds = after.items
    .filter((item) => !item.read)
    .map((item) => item.id)
    .sort();
  if (after.unread !== 2 || unreadIds.join(',') !== 'm1-s1,m1-s2') {
    throw new Error('Seeded inbox must retain exactly its two original unread notices');
  }
}
