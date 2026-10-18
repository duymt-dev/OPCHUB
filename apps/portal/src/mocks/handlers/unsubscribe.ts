import { UNSUBSCRIBE_INVALID, unsubscribeSchema } from '@opchub/shared/api-domains';
import {
  unsubscribeEmail,
  unsubscribeInfo,
  verifyUnsubscribeToken,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { apiError, API } from './util';

const invalid = () =>
  apiError(400, 'VALIDATION_ERROR', UNSUBSCRIBE_INVALID, [
    { path: 'token', message: UNSUBSCRIBE_INVALID },
  ]);

async function emailOf(raw: unknown): Promise<string | null> {
  const p = unsubscribeSchema.safeParse({ token: raw });
  return p.success ? verifyUnsubscribeToken(p.data.token) : null;
}

/** BUG-036: trang công khai huỷ nhận thư chiến dịch (GET email đã che, POST idempotent) */
export const unsubscribeHandlers = [
  http.get(`${API}/public/unsubscribe`, async ({ request }) => {
    const email = await emailOf(new URL(request.url).searchParams.get('token') ?? undefined);
    return email ? HttpResponse.json(unsubscribeInfo(email)) : invalid();
  }),
  http.post(`${API}/public/unsubscribe`, async ({ request }) => {
    const body: unknown = await request.json().catch(() => ({}));
    const token =
      typeof body === 'object' && body !== null && 'token' in body ? body.token : undefined;
    const email = await emailOf(token);
    return email ? HttpResponse.json(unsubscribeEmail(email)) : invalid();
  }),
];
