import { Module } from '@nestjs/common';
import { MailCoreModule } from '@/modules/mail';
import { CampaignsController } from './controllers/campaigns.controller';
import { UnsubscribeController } from './controllers/unsubscribe.controller';
import { AudienceRepository } from './repositories/audience.repository';
import { CampaignSenderService } from './services/campaign-sender.service';
import { CampaignService } from './services/campaign.service';
import { MailLogService } from './services/mail-log.service';
import { UnsubscribeService } from './services/unsubscribe.service';

const providers = [
  AudienceRepository,
  CampaignService,
  CampaignSenderService,
  MailLogService,
  UnsubscribeService,
];

/** Dùng chung api (màn Marketing) + worker (gửi theo lô, lịch gửi) */
@Module({ imports: [MailCoreModule], providers, exports: providers })
export class MarketingCoreModule {}

@Module({
  imports: [MarketingCoreModule],
  controllers: [CampaignsController, UnsubscribeController],
})
export class MarketingHttpModule {}
