import { bulkStatusSchema, userStatusUpdateSchema } from '@opchub/shared/api-domains';
import { setUserStatus, setUsersStatus } from '@opchub/shared/mock-domains';
import { addDays } from './member-lock-days';
import { http } from 'msw/http';
import { adminWriteGuard, parseAdminBody } from './admin-json';
import { param, reply, userIdOf } from './domain-util';
import { apiError, API } from './util';

export const memberStatusHandlers = [
  http.patch(`${API}/admin/users/:id/status`, async ({ request, params }) => {
    const denied = await adminWriteGuard(request, 'members.action');
    if (denied) return denied;
    const parsed = await parseAdminBody(request, userStatusUpdateSchema);
    if (!parsed.ok) return parsed.res;
    const result = setUserStatus(
      param(params, 'id'),
      parsed.data.status,
      userIdOf(request),
      parsed.data.reason ?? null,
      { until: addDays(parsed.data.days), kind: 'manual' },
    );
    // Native single-status controller treats any unchanged/missing target as conflict.
    return !result.ok && result.status === 404
      ? apiError(409, 'CONFLICT', 'Tài khoản đã ở trạng thái này')
      : reply(result);
  }),
  http.post(`${API}/admin/users/status`, async ({ request }) => {
    const denied = await adminWriteGuard(request, 'members.action');
    if (denied) return denied;
    const parsed = await parseAdminBody(request, bulkStatusSchema);
    return parsed.ok
      ? reply(
          setUsersStatus(
            parsed.data.userIds,
            parsed.data.status,
            userIdOf(request),
            parsed.data.reason ?? null,
            parsed.data.days,
          ),
        )
      : parsed.res;
  }),
];
