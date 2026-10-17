import { Module } from '@nestjs/common';
import { MailCoreModule } from '@/modules/mail';
import { CampaignsController } from './controllers/campaigns.controller';
import { AudienceRepository } from './repositories/audience.repository';
import { CampaignSenderService } from './services/campaign-sender.service';
import { CampaignService } from './services/campaign.service';
import { MailLogService } from './services/mail-log.service';

const providers = [AudienceRepository, CampaignService, CampaignSenderService, MailLogService];

/** Dùng chung api (màn Marketing) + worker (gửi theo lô, lịch gửi) */
@Module({ imports: [MailCoreModule], providers, exports: providers })
export class MarketingCoreModule {}

@Module({ imports: [MarketingCoreModule], controllers: [CampaignsController] })
export class MarketingHttpModule {}
