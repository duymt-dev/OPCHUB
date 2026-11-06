import { NotificationCoreModule } from '@/modules/notification';
import { AppNotifyService } from './services/app-notify.service';
import { AdminAppNotifyController } from './controllers/admin-app-notify.controller';
import { Module } from '@nestjs/common';
import { UploadsCoreModule } from '@/modules/uploads';
import { CategoriesController } from './controllers/categories.controller';
import { RolesController } from './controllers/roles.controller';
import { SettingsController } from './controllers/settings.controller';
import { SettingsAuditModule } from './settings-audit.module';
import { CategoryAdminService } from './services/category-admin.service';
import { SettingsAdminService } from './services/settings-admin.service';

/** Admin "Cài đặt & Phân quyền" (B40) — process api */
@Module({
  imports: [NotificationCoreModule, UploadsCoreModule, SettingsAuditModule],
  providers: [AppNotifyService, SettingsAdminService, CategoryAdminService],
  controllers: [
    AdminAppNotifyController,
    SettingsController,
    CategoriesController,
    RolesController,
  ],
})
export class SettingsHttpModule {}
