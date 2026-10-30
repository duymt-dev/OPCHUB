import {
  directorAppointmentSchema,
  directorConfigPatchSchema,
  directorRevokeSchema,
  directorRegionParamsSchema,
  directorMemberQuerySchema,
  directorHistoryQuerySchema,
} from '@opchub/shared/api-domains';
import {
  readMockDirectors,
  mockDirectorCandidates,
  readMockDirectorHistory,
  appointMockDirector,
  configureMockDirector,
  revokeMockDirector,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { mockAdminGuard } from './admin-guard';
import { adminWriteGuard, parseAdminBody } from './admin-json';
import { param, parseQuery, reply, userIdOf, validationError } from './domain-util';
import { API } from './util';

export const regionalDirectorHandlers = [
  http.get(
    `${API}/admin/gdv`,
    ({ request }) =>
      mockAdminGuard(request, 'affiliate.view') ?? HttpResponse.json(readMockDirectors()),
  ),
  http.get(`${API}/admin/gdv/members`, ({ request }) => {
    const denied = mockAdminGuard(request, 'affiliate.view');
    if (denied) return denied;
    const query = parseQuery(request.url, directorMemberQuerySchema);
    return query.ok ? HttpResponse.json(mockDirectorCandidates(query.data)) : query.res;
  }),
  http.get(`${API}/admin/gdv/history`, ({ request }) => {
    const denied = mockAdminGuard(request, 'affiliate.view');
    if (denied) return denied;
    const query = parseQuery(request.url, directorHistoryQuerySchema);
    return query.ok ? HttpResponse.json(readMockDirectorHistory(query.data)) : query.res;
  }),
  http.post(`${API}/admin/gdv`, async ({ request }) => {
    const denied = await adminWriteGuard(request, 'affiliate.gdv');
    if (denied) return denied;
    const body = await parseAdminBody(request, directorAppointmentSchema);
    return body.ok ? reply(appointMockDirector(userIdOf(request), body.data)) : body.res;
  }),
  http.patch(`${API}/admin/gdv/:region`, async ({ request, params }) => {
    const denied = await adminWriteGuard(request, 'affiliate.gdv');
    if (denied) return denied;
    const region = directorRegionParamsSchema.safeParse({ region: param(params, 'region') });
    if (!region.success) return validationError(region.error);
    const body = await parseAdminBody(request, directorConfigPatchSchema);
    return body.ok
      ? reply(configureMockDirector(userIdOf(request), region.data.region, body.data))
      : body.res;
  }),
  http.delete(`${API}/admin/gdv/:region`, async ({ request, params }) => {
    const denied = await adminWriteGuard(request, 'affiliate.gdv');
    if (denied) return denied;
    const region = directorRegionParamsSchema.safeParse({ region: param(params, 'region') });
    if (!region.success) return validationError(region.error);
    const body = await parseAdminBody(request, directorRevokeSchema);
    return body.ok
      ? reply(revokeMockDirector(userIdOf(request), region.data.region, body.data))
      : body.res;
  }),
];
