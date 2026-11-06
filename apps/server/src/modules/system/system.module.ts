import { LlmConfigCoreModule } from '@/modules/llm-config';
import { Module } from '@nestjs/common';
import { AccountCoreModule } from '@/modules/account';
import { AdminAccountCoreModule } from '@/modules/admin-account';
import { ChatCoreModule } from '@/modules/chat';
import { ExportCoreModule } from '@/modules/export';
import { UploadsCoreModule } from '@/modules/uploads';
import { HousekeepingService } from './housekeeping.service';

/** Việc hệ thống định kỳ (NA-13) — chỉ điều phối, mỗi domain tự dọn bảng của mình */
@Module({
  imports: [
    LlmConfigCoreModule,
    AccountCoreModule,
    AdminAccountCoreModule,
    ChatCoreModule,
    ExportCoreModule,
    UploadsCoreModule,
  ],
  providers: [HousekeepingService],
  exports: [HousekeepingService],
})
export class SystemCoreModule {}
