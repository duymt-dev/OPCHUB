import { ADMIN_AUTH_MESSAGES, totpVerifySchema } from '@opchub/shared/api';
import { parseBody } from './domain-util';
import { apiError } from './util';
import { mockAdminSessionResponse } from './mock-admin-session';
import { verifyMockTotp } from './totp';

const TTL = 5 * 60 * 1000;
const EXPIRED = 'Phiên xác thực 2 lớp đã hết hạn, vui lòng đăng nhập lại';
const challenges = new Map<string, { id: string; expires: number; failures: number }>();

/** Native AdminMfaService uses an opaque24-byte token, never an encoded account ID. */
export function issueMockAdminMfa(id: string): string {
  const now = Date.now();
  for (const [token, entry] of challenges) if (entry.expires <= now) challenges.delete(token);
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const token = btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_');
  challenges.set(token, { id, expires: now + TTL, failures: 0 });
  return token;
}

export async function verifyMockAdminMfa(request: Request): Promise<Response> {
  const body = await parseBody(request, totpVerifySchema);
  if (!body.ok) return body.res;
  const { mfaToken, code } = body.data;
  const entry = challenges.get(mfaToken);
  if (!entry || entry.expires <= Date.now()) {
    challenges.delete(mfaToken);
    return apiError(401, 'UNAUTHORIZED', EXPIRED);
  }
  if (!(await verifyMockTotp(code))) {
    entry.failures += 1;
    if (entry.failures >= 5) challenges.delete(mfaToken);
    return apiError(401, 'UNAUTHORIZED', ADMIN_AUTH_MESSAGES.codeInvalid);
  }
  challenges.delete(mfaToken);
  return mockAdminSessionResponse(entry.id);
}
