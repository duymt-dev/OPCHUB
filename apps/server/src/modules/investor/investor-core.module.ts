import { Module } from '@nestjs/common';
import { AdminInvestorsController } from './controllers/admin-investors.controller';
import { InvestorPortalController } from './controllers/investor-portal.controller';
import { InterestRepository } from './repositories/interest.repository';
import { InvestorAdminRepository } from './repositories/investor-admin.repository';
import { InterestService } from './services/interest.service';
import { InvestorAdminService } from './services/investor-admin.service';

const services = [
  InterestRepository,
  InvestorAdminRepository,
  InterestService,
  InvestorAdminService,
];

/** Nhà đầu tư (B33, D-72): quan tâm + Admin gom theo người (danh sách + xuất) */
@Module({ providers: services, exports: services })
export class InvestorCoreModule {}

@Module({
  imports: [InvestorCoreModule],
  controllers: [InvestorPortalController, AdminInvestorsController],
})
export class InvestorHttpModule {}
