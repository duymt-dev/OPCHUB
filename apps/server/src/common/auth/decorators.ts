import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { AccountType, AdminPermissionKey } from '@opchub/shared';
import type { Request } from 'express';
import { unauthorized } from '../errors';
import type { AccessClaims, AuthRealm } from './access-token';
import type { GroupRoleNeed } from './group-role.port';

/** Metadata key cho guard (auth-rbac.md › Thứ tự guard) */
export const META = {
  public: 'auth:public',
  skipFee: 'auth:skip_fee',
  accountTypes: 'auth:account_types',
  groupRole: 'auth:group_role',
  realms: 'auth:realms',
  adminPermissions: 'auth:admin_permissions',
  adminAny: 'auth:admin_any',
  adminSetup: 'auth:admin_setup',
} as const;

/** Bỏ qua xác thực (login, register, webhook có guard HMAC riêng) */
export const Public = () => SetMetadata(META.public, true);

/** Route Portal không cần phí còn hiệu lực: phí thành viên, hồ sơ, gửi phiếu YC, đăng xuất */
export const SkipMembershipFee = () => SetMetadata(META.skipFee, true);

/** D-14: Nhà đầu tư bỏ qua paywall nhưng CHỈ vào route có decorator này */
export const AllowAccountTypes = (...types: AccountType[]) => SetMetadata(META.accountTypes, types);

/**
 * Route quản trị (§21, TIP-V2-203): cần đủ mọi khoá trong 25 khoá RBAC (Super Admin luôn qua).
 * Thiếu khoá thao tác mà có khoá Xem của menu → 403 `VIEW_ONLY` (RB-R07); còn lại 403 `FORBIDDEN`.
 */
export const RequireAdmin = (...keys: AdminPermissionKey[]) =>
  SetMetadata(META.adminPermissions, keys);

/** Route quản trị cần ÍT NHẤT một khoá trong danh sách (badge sidebar, trạng thái job xuất) */
export const RequireAnyAdmin = (...keys: readonly AdminPermissionKey[]) =>
  SetMetadata(META.adminAny, keys);

/** Quyền theo nhóm (D-43) — `groupId` lấy từ `params.id` */
export const RequireGroupRole = (role: GroupRoleNeed) => SetMetadata(META.groupRole, role);

/**
 * D-62 (TIP-V2-202): realm được gọi route. Mặc định route `admin/**` chỉ nhận `admin`, route khác
 * chỉ nhận `member`. Route dùng chung (thông báo, tải ảnh, trình xem chat D-26) khai cả hai.
 */
export const AllowRealm = (...realms: AuthRealm[]) => SetMetadata(META.realms, realms);

/** SEC-R01/R02: route dùng được trong phiên Admin hạn chế (đổi mật khẩu tạm, thiết lập 2FA, me) */
export const AdminSetupAllowed = () => SetMetadata(META.adminSetup, true);

export type AuthedRequest = Request & { user?: AccessClaims };

/** Claim của người gọi (đã qua JwtAuthGuard) */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
  if (!user) throw unauthorized();
  return user;
});
