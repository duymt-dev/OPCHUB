import { Module } from '@nestjs/common';
import { NotificationCoreModule } from '../notification';
import { AdminInvestorsController } from './controllers/admin-investors.controller';
import { InvestorPortalController } from './controllers/investor-portal.controller';
import { InterestRepository } from './repositories/interest.repository';
import { InvestorAdminRepository } from './repositories/investor-admin.repository';
import { InvestorCommentRepository } from './repositories/investor-comment.repository';
import { InterestService } from './services/interest.service';
import { InvestorAdminService } from './services/investor-admin.service';
import { InvestorNotifyHandler } from './services/investor-notify.handler';

const services = [
  InterestRepository,
  InvestorAdminRepository,
  InvestorCommentRepository,
  InterestService,
  InvestorAdminService,
  InvestorNotifyHandler,
];

/** Nhà đầu tư (B33): quan tâm, luồng trao đổi chung (TIP-V2-107), Admin gom theo người */
@Module({ imports: [NotificationCoreModule], providers: services, exports: services })
export class InvestorCoreModule {}

@Module({
  imports: [InvestorCoreModule],
  controllers: [InvestorPortalController, AdminInvestorsController],
})
export class InvestorHttpModule {}
