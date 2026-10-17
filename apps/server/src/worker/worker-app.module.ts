import { Module } from '@nestjs/common';
import { ConfigModule } from '@/common/config';

/** Process BullMQ worker — processor thêm theo từng TIP */
@Module({
  imports: [ConfigModule],
})
export class WorkerAppModule {}
