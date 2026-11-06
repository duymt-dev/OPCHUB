import {
  regionalAppointSchema,
  regionalCandidateQuerySchema,
  regionalParamsSchema,
  regionalPatchBodySchema,
} from '@opchub/shared/api-domains';
import {
  mockAdminMeOf,
  mockRegionalDirectors,
  mockRegionalCandidates,
  mockRegionalAppoint,
  mockRegionalRevoke,
  mockRegionalPatch,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { mockAdminGuard } from './admin-guard';
import { parseBody, parseQuery, reply, userIdOf, validationError } from './domain-util';
import { API } from './util';

export const regionalDirectorHandlers = [
  http.get(
    `${API}/admin/gdv`,
    ({ request }) =>
      mockAdminGuard(request, 'affiliate.view') ??
      HttpResponse.json(mockRegionalDirectors(!mockAdminGuard(request, 'affiliate.regional'))),
  ),
  http.get(`${API}/admin/gdv/candidates`, ({ request }) => {
    const denied = mockAdminGuard(request, 'affiliate.regional');
    if (denied) return denied;
    const q = parseQuery(request.url, regionalCandidateQuerySchema);
    return q.ok ? HttpResponse.json(mockRegionalCandidates(q.data.region, q.data.q)) : q.res;
  }),
  http.post(`${API}/admin/gdv`, async ({ request }) => {
    const denied = mockAdminGuard(request, 'affiliate.regional');
    if (denied) return denied;
    const b = await parseBody(request, regionalAppointSchema);
    return b.ok
      ? reply(
          mockRegionalAppoint(
            b.data.region,
            b.data.userId,
            mockAdminMeOf(userIdOf(request))?.roleName ?? '',
          ),
        )
      : b.res;
  }),
  http.patch(`${API}/admin/gdv/:region`, async ({ request, params }) => {
    const denied = mockAdminGuard(request, 'affiliate.regional');
    if (denied) return denied;
    const p = regionalParamsSchema.safeParse(params);
    if (!p.success) return validationError(p.error);
    const b = await parseBody(request, regionalPatchBodySchema);
    return b.ok ? reply(mockRegionalPatch(p.data.region, b.data)) : b.res;
  }),
  http.delete(`${API}/admin/gdv/:region`, ({ request, params }) => {
    const denied = mockAdminGuard(request, 'affiliate.regional');
    if (denied) return denied;
    const p = regionalParamsSchema.safeParse(params);
    return p.success
      ? reply(mockRegionalRevoke(p.data.region, mockAdminMeOf(userIdOf(request))?.roleName ?? ''))
      : validationError(p.error);
  }),
];
