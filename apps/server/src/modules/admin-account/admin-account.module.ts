import { Global, Module } from '@nestjs/common';
import { ADMIN_EMAIL_PORT, AccountCoreModule } from '@/modules/account';
import { MailCoreModule } from '@/modules/mail';
import { AdminAccountsController } from './controllers/admin-accounts.controller';
import { AdminRolesController } from './controllers/admin-roles.controller';
import { AdminRoleRepository } from './repositories/admin-role.repository';
import { AdminUserRepository } from './repositories/admin-user.repository';
import { AdminAccountsService } from './services/admin-accounts.service';
import { AdminEmailService } from './services/admin-email.service';
import { AdminRolesService } from './services/admin-roles.service';
import { RoleGrantsService } from './services/role-grants.service';

const core = [AdminUserRepository, AdminRoleRepository, AdminEmailService, RoleGrantsService];

/**
 * Domain admin-account (D-52, TIP-V2-201) — TK quản trị + vai trò RBAC tách khỏi `users`.
 * Global: cung cấp `ADMIN_EMAIL_PORT` cho account (đăng ký / SSO) mà account không import ngược.
 */
@Global()
@Module({
  providers: [...core, { provide: ADMIN_EMAIL_PORT, useExisting: AdminEmailService }],
  exports: [...core, ADMIN_EMAIL_PORT],
})
export class AdminAccountCoreModule {}

/** Process api: tab "Tài khoản quản trị" + "Vai trò & phân quyền" */
@Module({
  imports: [AdminAccountCoreModule, AccountCoreModule, MailCoreModule],
  providers: [AdminAccountsService, AdminRolesService],
  controllers: [AdminAccountsController, AdminRolesController],
})
export class AdminAccountHttpModule {}
