import { Module } from '@nestjs/common';
import { ConfigModule } from '@/common/config';
import { HealthController } from './health.controller';

/** Process REST `/v1` — import `<Domain>HttpModule` (chỉ thêm dòng) */
@Module({
  imports: [ConfigModule],
  controllers: [HealthController],
})
export class ApiAppModule {}
