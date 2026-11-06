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
  imports: [UploadsCoreModule, SettingsAuditModule],
  providers: [SettingsAdminService, CategoryAdminService],
  controllers: [SettingsController, CategoriesController, RolesController],
})
export class SettingsHttpModule {}
