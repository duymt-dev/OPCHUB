import { Module } from '@nestjs/common';
import { CoreModule } from '@/common/core.module';

/** Process BullMQ worker — processor thêm theo từng TIP */
@Module({
  imports: [CoreModule],
})
export class WorkerAppModule {}
