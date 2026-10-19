import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { AccountType, PermissionKey } from '@opchub/shared';
import type { Request } from 'express';
import { unauthorized } from '../errors';
import type { AccessClaims, AuthRealm } from './access-token';

/** Metadata key cho guard (auth-rbac.md › Thứ tự guard) */
export const META = {
  public: 'auth:public',
  skipFee: 'auth:skip_fee',
  accountTypes: 'auth:account_types',
  permissions: 'auth:permissions',
  groupRole: 'auth:group_role',
  realms: 'auth:realms',
  adminSetup: 'auth:admin_setup',
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
