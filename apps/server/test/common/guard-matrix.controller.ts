import { Controller, Get, Module, Param } from '@nestjs/common';
import {
  AdminSetupAllowed,
  AllowAccountTypes,
  AllowRealm,
  type GroupRolePort,
  type GroupRoleValue,
  Public,
  RequireGroupRole,
  RequireAdmin,
  SkipMembershipFee,
} from '@/common/auth';

/** Controller chỉ đăng ký trong test ma trận guard (TIP-B07) */
@Controller('guard-matrix')
export class GuardMatrixController {
  @Public()
  @Get('public')
  open(): { ok: true } {
    return { ok: true };
  }

  /** Mặc định: đăng nhập + phí */
  @Get('portal')
  portal(): { ok: true } {
    return { ok: true };
  }

  @SkipMembershipFee()
  @Get('no-fee')
  noFee(): { ok: true } {
    return { ok: true };
  }

  @AllowAccountTypes('investor')
  @Get('investor')
  investor(): { ok: true } {
    return { ok: true };
  }

  @RequireGroupRole('owner')
  @Get('groups/:id/owner')
  owner(@Param('id') id: string): { ok: true; id: string } {
    return { ok: true, id };
  }
}

/** Route quản trị (`/v1/admin/**` → mặc định chỉ realm admin, D-62) */
@Controller('admin/guard-matrix')
export class AdminGuardMatrixController {
  @Get('plain')
  plain(): { ok: true } {
    return { ok: true };
  }

  @AdminSetupAllowed()
  @Get('setup')
  setup(): { ok: true } {
    return { ok: true };
  }

  @RequireAdmin('members.view')
  @Get('members-view')
  membersView(): { ok: true } {
    return { ok: true };
  }

  @RequireAdmin('members.action')
  @Get('members-action')
  membersAction(): { ok: true } {
    return { ok: true };
  }

  @RequireAdmin('settings.admins')
  @Get('settings-admins')
  settingsAdmins(): { ok: true } {
    return { ok: true };
  }

  @AllowRealm('member', 'admin')
  @Get('shared')
  shared(): { ok: true } {
    return { ok: true };
  }
}

/** Vai trò nhóm giả: map `${groupId}:${userId}` → role */
export const fakeGroupRoles = new Map<string, GroupRoleValue>();
export const fakeGroupRolePort: GroupRolePort = {
  roleOf: (groupId, userId) => Promise.resolve(fakeGroupRoles.get(`${groupId}:${userId}`) ?? null),
};

@Module({ controllers: [GuardMatrixController, AdminGuardMatrixController] })
export class GuardMatrixModule {}
