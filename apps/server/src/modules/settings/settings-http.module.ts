import { Module } from '@nestjs/common';
import { CategoriesController } from './controllers/categories.controller';
import { RolesController } from './controllers/roles.controller';
import { SettingsController } from './controllers/settings.controller';
import { AdminAccountsService } from './services/admin-accounts.service';
import { AuditLogService } from './services/audit-log.service';
import { CategoryAdminService } from './services/category-admin.service';
import { RolePermissionsService } from './services/role-permissions.service';
import { SettingsAdminService } from './services/settings-admin.service';

/** Admin "Cài đặt & Phân quyền" (B40) — process api */
@Module({
  providers: [
    SettingsAdminService,
    CategoryAdminService,
    RolePermissionsService,
    AdminAccountsService,
    AuditLogService,
  ],
  controllers: [SettingsController, CategoriesController, RolesController],
})
export class SettingsHttpModule {}
