import { Global, Module } from '@nestjs/common';
import { ONBOARDING_PORT } from '../account';
import { MailCoreModule } from '../mail';
import { NotificationCoreModule } from '../notification';
import { AdminOnboardingController } from './controllers/admin-onboarding.controller';
import { OnboardingController } from './controllers/onboarding.controller';
import { OnboardingRepository } from './repositories/onboarding.repository';
import { OnboardingAutoRemindService } from './services/onboarding-auto-remind.service';
import { OnboardingRemindService } from './services/onboarding-remind.service';
import { OnboardingService } from './services/onboarding.service';

const services = [
  OnboardingRepository,
  OnboardingService,
  OnboardingRemindService,
  OnboardingAutoRemindService,
];

/**
 * V4-611 Hướng dẫn bắt đầu 8 bước (REQ-505, D-85, D-88) — dùng chung api + worker.
 * Global: account (bảng Admin › Thành viên) inject `ONBOARDING_PORT` mà không import ngược.
 */
@Global()
@Module({
  imports: [MailCoreModule, NotificationCoreModule],
  providers: [...services, { provide: ONBOARDING_PORT, useExisting: OnboardingService }],
  exports: [...services, ONBOARDING_PORT],
})
export class OnboardingCoreModule {}

@Module({
  imports: [OnboardingCoreModule],
  controllers: [OnboardingController, AdminOnboardingController],
})
export class OnboardingHttpModule {}
