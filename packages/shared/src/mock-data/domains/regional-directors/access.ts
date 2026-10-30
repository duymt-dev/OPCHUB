import type { AdminPermissionKey } from '../../../permissions';
import { listMockAdminAccounts, mockAdminMeOf } from '../admin-rbac';
import { ok, type MockResult } from '../util';
import type { AdminMe } from '../../../api';

/** Keep direct mock commands permission-safe too; HTTP additionally checks session/2FA. */
export function directorActor(actorId: string, key: AdminPermissionKey): MockResult<AdminMe> {
  const actor = mockAdminMeOf(actorId);
  const active = listMockAdminAccounts().some(
    (row) => row.id === actorId && row.status === 'active',
  );
  if (!actor || !active || !actor.permissions.includes(key))
    return {
      ok: false,
      status: 403,
      code: 'FORBIDDEN',
      message: 'Bạn không có quyền thực hiện thao tác này',
    };
  return ok(actor);
}
