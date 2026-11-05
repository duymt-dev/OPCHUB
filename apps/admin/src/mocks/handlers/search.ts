import type { AdminPermissionKey } from '@opchub/shared';
import { globalSearchQuerySchema } from '@opchub/shared/api-domains';
import { mockAdminMeOf, mockGlobalSearch } from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { mockAdminGuard } from './admin-guard';
import { parseQuery, userIdOf } from './domain-util';
import { API } from './util';

const KEYS: AdminPermissionKey[] = ['members.view', 'stores.view', 'projects.view', 'groups.view'];
export const searchHandlers = [
  http.get(`${API}/admin/search`, ({ request }) => {
    const results = KEYS.map((key) => mockAdminGuard(request, key));
    if (results.every((result) => result !== null)) return results[0];
    const query = parseQuery(request.url, globalSearchQuerySchema);
    if (!query.ok) return query.res;
    const userId = userIdOf(request);
    const permissions =
      mockAdminMeOf(userId)?.permissions.filter((key): key is AdminPermissionKey =>
        KEYS.includes(key as AdminPermissionKey),
      ) ?? [];
    return HttpResponse.json(mockGlobalSearch(query.data.q, userId, { admin: true, permissions }));
  }),
];
