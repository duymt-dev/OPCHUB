import { Global, Module } from '@nestjs/common';
import { AppSettingsService } from './app-settings.service';

/** Đọc cấu hình hệ thống cho mọi domain; màn Admin Cài đặt (B54) thêm HttpModule */
@Global()
@Module({ providers: [AppSettingsService], exports: [AppSettingsService] })
export class SettingsCoreModule {}
