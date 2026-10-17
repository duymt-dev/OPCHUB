import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@/common/auth';
import { CoreModule } from '@/common/core.module';
import { ThrottleModule } from '@/common/throttle/throttle.module';
import { AccountHttpModule } from '@/modules/account';
import { MembershipFeeCoreModule } from '@/modules/membership-fee';
import { HealthController } from './health.controller';

/** Process REST `/v1` — import `<Domain>HttpModule` (chỉ thêm dòng) */
@Module({
  imports: [
    CoreModule,
    ThrottleModule,
    AuthGuardsModule,
    MembershipFeeCoreModule,
    AccountHttpModule,
  ],
  controllers: [HealthController],
})
export class ApiAppModule {}
