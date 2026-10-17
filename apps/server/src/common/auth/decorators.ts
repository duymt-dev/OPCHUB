import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { AccountType, PermissionKey } from '@opchub/shared';
import type { Request } from 'express';
import { unauthorized } from '../errors';
import type { AccessClaims } from './access-token';

/** Metadata key cho guard (auth-rbac.md › Thứ tự guard) */
export const META = {
  public: 'auth:public',
  skipFee: 'auth:skip_fee',
  accountTypes: 'auth:account_types',
  permissions: 'auth:permissions',
  groupRole: 'auth:group_role',
} as const;

/** Bỏ qua xác thực (login, register, webhook có guard HMAC riêng) */
export const Public = () => SetMetadata(META.public, true);

/** Route Portal không cần phí còn hiệu lực: phí thành viên, hồ sơ, gửi phiếu YC, đăng xuất */
export const SkipMembershipFee = () => SetMetadata(META.skipFee, true);

/** D-14: Nhà đầu tư bỏ qua paywall nhưng CHỈ vào route có decorator này */
export const AllowAccountTypes = (...types: AccountType[]) => SetMetadata(META.accountTypes, types);

/** Route quản trị: cần đủ mọi key (super_admin luôn qua). Bỏ qua paywall. */
export const RequirePermission = (...keys: PermissionKey[]) => SetMetadata(META.permissions, keys);

/** Quyền theo nhóm (D-43) — `groupId` lấy từ `params.id` */
export const RequireGroupRole = (role: 'owner' | 'moderator') => SetMetadata(META.groupRole, role);

export type AuthedRequest = Request & { user?: AccessClaims };

/** Claim của người gọi (đã qua JwtAuthGuard) */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
  if (!user) throw unauthorized();
  return user;
});
