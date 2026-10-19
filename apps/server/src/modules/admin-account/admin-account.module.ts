import { Global, Module } from '@nestjs/common';
import { ADMIN_DIRECTORY_PORT, ADMIN_GRANTS_PORT } from '@/common/auth';
import { ADMIN_EMAIL_PORT, AccountCoreModule } from '@/modules/account';
import { MailCoreModule } from '@/modules/mail';
import { AdminAccountsController } from './controllers/admin-accounts.controller';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminRolesController } from './controllers/admin-roles.controller';
import { AdminRefreshTokenRepository } from './repositories/admin-refresh-token.repository';
import { AdminRoleRepository } from './repositories/admin-role.repository';
import { AdminUserRepository } from './repositories/admin-user.repository';
import { AdminAccountsService } from './services/admin-accounts.service';
import { AdminAuthService } from './services/admin-auth.service';
import { AdminMfaService } from './services/admin-mfa.service';
import { AdminSessionService } from './services/admin-session.service';
import { AdminDirectoryService } from './services/admin-directory.service';
import { AdminEmailService } from './services/admin-email.service';
import { AdminRolesService } from './services/admin-roles.service';
import { RoleGrantsService } from './services/role-grants.service';

const core = [
  AdminUserRepository,
  AdminRoleRepository,
  AdminRefreshTokenRepository,
  AdminEmailService,
  AdminDirectoryService,
  RoleGrantsService,
];

/**
 * Domain admin-account (D-52, TIP-V2-201) — TK quản trị + vai trò RBAC tách khỏi `users`.
 * Global: cung cấp `ADMIN_EMAIL_PORT` cho account (đăng ký / SSO) mà account không import ngược.
 */
@Global()
@Module({
  imports: [AccountCoreModule],
  providers: [
    ...core,
    { provide: ADMIN_EMAIL_PORT, useExisting: AdminEmailService },
    { provide: ADMIN_GRANTS_PORT, useExisting: RoleGrantsService },
    { provide: ADMIN_DIRECTORY_PORT, useExisting: AdminDirectoryService },
  ],
  exports: [...core, ADMIN_EMAIL_PORT, ADMIN_GRANTS_PORT, ADMIN_DIRECTORY_PORT],
})
export class AdminAccountCoreModule {}

/** Process api: tab "Tài khoản quản trị" + "Vai trò & phân quyền" */
@Module({
  imports: [AdminAccountCoreModule, AccountCoreModule, MailCoreModule],
  providers: [
    AdminAccountsService,
    AdminRolesService,
    AdminSessionService,
    AdminMfaService,
    AdminAuthService,
  ],
  controllers: [AdminAuthController, AdminAccountsController, AdminRolesController],
})
export class AdminAccountHttpModule {}
