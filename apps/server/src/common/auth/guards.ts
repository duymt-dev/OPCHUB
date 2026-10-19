import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ACCOUNT_LOCKED_MESSAGE, type AccountType, type PermissionKey } from '@opchub/shared';
import { AppError, forbidden, notFound, unauthorized } from '../errors';
import { type AccessClaims, AccessTokenService, type AuthRealm } from './access-token';
import { AuthStateService } from './auth-state.service';
import { type AuthedRequest, META } from './decorators';
import { isFeeUsable } from './fee-access';
import { GROUP_ROLE_PORT, type GroupRolePort, satisfiesGroupRole } from './group-role.port';
import { PermissionCheck } from './permission-check';

/**
 * Năm guard toàn cục, thứ tự cố định (auth-rbac.md):
 * JwtAuth → AccountStatus → MembershipFee → Permission → GroupRole.
 * Không guard nào truy vấn DB (S-03): claim JWT + Redis.
 */

const meta = <T>(r: Reflector, key: string, ctx: ExecutionContext): T | undefined =>
  r.getAllAndOverride<T>(key, [ctx.getHandler(), ctx.getClass()]);

const reqOf = (ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AuthedRequest>();

const isPublic = (r: Reflector, ctx: ExecutionContext) =>
  meta<boolean>(r, META.public, ctx) === true;

/** Route quản trị: `/v1/admin/**` (prefix toàn cục `v1`) */
const ADMIN_PATH = /^\/v1\/admin(\/|$)/;

export const WRONG_REALM_MESSAGE = 'Tài khoản này đăng nhập ở cổng khác';
const RESTRICTED_MESSAGE = {
  password: 'Vui lòng đổi mật khẩu tạm trước khi tiếp tục',
  two_factor: 'Vui lòng bật xác thực 2 lớp trước khi tiếp tục',
} as const;

/**
 * D-62, RB-R03 (TIP-V2-202): realm phiên phải khớp route — `/admin/**` chỉ phiên quản trị, route
 * Portal chỉ phiên thành viên; route dùng chung khai `@AllowRealm`. Phiên Admin hạn chế (SEC-R01/02)
 * chỉ vào route `@AdminSetupAllowed`.
 */
function assertRealm(r: Reflector, ctx: ExecutionContext, user: AccessClaims): void {
  const path = reqOf(ctx).originalUrl.split('?')[0] ?? '';
  const fallback: AuthRealm = ADMIN_PATH.test(path) ? 'admin' : 'member';
  const allowed = meta<AuthRealm[]>(r, META.realms, ctx) ?? [fallback];
  if (!allowed.includes(user.realm)) throw new AppError('WRONG_PORTAL', WRONG_REALM_MESSAGE);
  if (user.realm === 'admin' && user.restricted && !meta<boolean>(r, META.adminSetup, ctx)) {
    const code =
      user.restricted === 'password' ? 'PASSWORD_CHANGE_REQUIRED' : 'TWO_FACTOR_SETUP_REQUIRED';
    throw new AppError(code, RESTRICTED_MESSAGE[user.restricted]);
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: AccessTokenService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (isPublic(this.reflector, ctx)) return true;
    const req = reqOf(ctx);
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) throw unauthorized('Vui lòng đăng nhập');
    req.user = await this.tokens.verify(token);
    assertRealm(this.reflector, ctx, req.user);
    return true;
  }
}

@Injectable()
export class AccountStatusGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly state: AuthStateService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (isPublic(this.reflector, ctx)) return true;
    const user = reqOf(ctx).user;
    if (!user) throw unauthorized();
    const [locked, version] = await Promise.all([
      this.state.isLocked(user.sub, user.realm),
      this.state.permVersion(user.sub, user.realm),
    ]);
    if (locked) throw forbidden(ACCOUNT_LOCKED_MESSAGE);
    // Khoá / đổi quyền / đổi mật khẩu → version tăng → token cũ hết hiệu lực, client refresh
    if (version !== null && version > user.permVersion) {
      throw unauthorized('Phiên đăng nhập đã thay đổi, vui lòng đăng nhập lại');
    }
    return true;
  }
}

@Injectable()
export class MembershipFeeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly state: AuthStateService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (isPublic(this.reflector, ctx)) return true;
    // Route quản trị kiểm bằng permission, không paywall
    if (meta<PermissionKey[]>(this.reflector, META.permissions, ctx)) return true;
    if (meta<boolean>(this.reflector, META.skipFee, ctx)) return true;
    const user = reqOf(ctx).user;
    if (!user) throw unauthorized();
    // TK quản trị không đóng phí thành viên
    if (user.realm === 'admin') return true;

    const allowed = meta<AccountType[]>(this.reflector, META.accountTypes, ctx) ?? [];
    if (user.accountType === 'investor') {
      // D-14: NĐT miễn phí nhưng chỉ vào route cho phép
      if (allowed.includes('investor')) return true;
      throw forbidden('Tài khoản Nhà đầu tư không dùng được chức năng này');
    }
    const fee = (await this.state.fee(user.sub)) ?? user.membershipFee;
    // D-57: so `valid_until` tức thời, không chờ job đổi trạng thái (BUG-018)
    if (isFeeUsable(fee, new Date())) return true;
    throw new AppError('MEMBERSHIP_REQUIRED', 'Vui lòng đóng phí thành viên để tiếp tục');
  }
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly perms: PermissionCheck,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const keys = meta<PermissionKey[]>(this.reflector, META.permissions, ctx);
    if (!keys?.length || isPublic(this.reflector, ctx)) return true;
    const user = reqOf(ctx).user;
    if (!user) throw unauthorized();
    const can = await this.perms.checker(user);
    // Luật 4: chỉ kiểm permission key, không so tên vai trò
    if (keys.every(can)) return true;
    throw forbidden();
  }
}

@Injectable()
export class GroupRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(GROUP_ROLE_PORT) private readonly groups: GroupRolePort,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const need = meta<'owner' | 'moderator'>(this.reflector, META.groupRole, ctx);
    if (!need) return true;
    const req = reqOf(ctx);
    const groupId = (req.params as Record<string, string | undefined>).id;
    if (!req.user || !groupId) throw notFound();
    const role = await this.groups.roleOf(groupId, req.user.sub);
    // Không lộ sự tồn tại của nhóm (api-conventions: 404)
    if (!role || !satisfiesGroupRole(role, need)) throw notFound();
    return true;
  }
}
