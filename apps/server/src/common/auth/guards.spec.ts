import 'reflect-metadata';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { regionalDirectorDeniedMessage, type AdminPermissionKey } from '@opchub/shared';
import { describe, expect, it } from 'vitest';
import { RequireAdmin } from './decorators';
import { PermissionGuard } from './guards';
import type { PermissionCheck } from './permission-check';

class Routes {
  write(this: void) {
    return undefined;
  }
  candidates(this: void) {
    return undefined;
  }
  ordinary(this: void) {
    return undefined;
  }
}
for (const method of ['write', 'candidates', 'ordinary'] as const) {
  const descriptor = Object.getOwnPropertyDescriptor(Routes.prototype, method);
  if (!descriptor) throw Error('Missing guard fixture method');
  const decorator =
    method === 'write'
      ? RequireAdmin('affiliate.regional', { deniedMessage: regionalDirectorDeniedMessage })
      : RequireAdmin('affiliate.regional');
  decorator(Routes.prototype, method, descriptor);
}

const context = (method: keyof Routes): ExecutionContext =>
  ({
    getHandler: () => Routes.prototype[method],
    getClass: () => Routes,
    switchToHttp: () => ({ getRequest: () => ({ user: { roleName: 'Vai trò thử' } }) }),
  }) as unknown as ExecutionContext;

function guard(keys: readonly AdminPermissionKey[]) {
  const perms = { checker: () => Promise.resolve((key: AdminPermissionKey) => keys.includes(key)) };
  return new PermissionGuard(new Reflector(), perms as unknown as PermissionCheck);
}

describe('A4 regional permission denial text', () => {
  it('spells the approved regional message exactly', () => {
    expect(regionalDirectorDeniedMessage('Kế toán')).toBe(
      'Vai trò Kế toán không có quyền bổ nhiệm / thu hồi GĐ Vùng',
    );
  });
  it.each([true, false])('A4 denied message preserves status/code (view=%s)', async (view) => {
    await expect(
      guard(view ? ['affiliate.view'] : []).canActivate(context('write')),
    ).rejects.toMatchObject({
      status: 403,
      code: view ? 'VIEW_ONLY' : 'FORBIDDEN',
      message: 'Vai trò Vai trò thử không có quyền bổ nhiệm / thu hồi GĐ Vùng',
    });
  });
  it.each(['ordinary', 'candidates'] as const)('keeps generic denial for %s', async (method) => {
    await expect(guard(['affiliate.view']).canActivate(context(method))).rejects.toMatchObject({
      code: 'VIEW_ONLY',
      message: 'Vai trò Vai trò thử chỉ có quyền xem mục này',
    });
    await expect(guard([]).canActivate(context(method))).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Bạn không có quyền thực hiện thao tác này',
    });
  });
  it('checks granted permission keys independently of role labels', async () => {
    expect(await guard(['affiliate.regional']).canActivate(context('write'))).toBe(true);
  });
});
