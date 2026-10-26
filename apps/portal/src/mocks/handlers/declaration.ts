import { declarationSchema } from '@opchub/shared/api';
import {
  mockDeclarationAccount,
  mockDeclarationDraft,
  registeredMockSession,
  saveMockDeclaration,
} from '@opchub/shared/mock-domains';
import { http } from 'msw/http';
import { parseBody, reply, userIdOf } from './domain-util';
import { apiError, API } from './util';

/** V4-607 `GET/PUT /me/declaration` — TK seed coi như đã khai báo, chỉ TK đăng ký trong phiên mock */
export const declarationHandlers = [
  http.get(`${API}/me/declaration`, ({ request }) =>
    reply(mockDeclarationDraft(userIdOf(request))),
  ),
  http.put(`${API}/me/declaration`, async ({ request }) => {
    const id = userIdOf(request);
    const body = await parseBody(request, declarationSchema);
    if (!body.ok) return body.res;
    const account = mockDeclarationAccount(id);
    const saved = saveMockDeclaration(id, account?.accountType ?? body.data.accountType, body.data);
    if (!saved.ok) return apiError(saved.status, saved.code, saved.message, saved.fields);
    const me = account ? registeredMockSession(account.email) : undefined;
    return me
      ? reply({ ok: true, data: me })
      : apiError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản');
  }),
];
