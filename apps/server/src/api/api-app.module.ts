import { Module } from '@nestjs/common';
import { CoreModule } from '@/common/core.module';
import { ThrottleModule } from '@/common/throttle/throttle.module';
import { HealthController } from './health.controller';

/** Process REST `/v1` — import `<Domain>HttpModule` (chỉ thêm dòng) */
@Module({
  imports: [CoreModule, ThrottleModule],
  controllers: [HealthController],
})
export class ApiAppModule {}
