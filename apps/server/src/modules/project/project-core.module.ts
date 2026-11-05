import { ProjectSearchRepository } from './repositories/project-search.query';
import { ProjectSearchService } from './services/project-search.service';
import { Global, Module } from '@nestjs/common';
import { AccountCoreModule } from '../account';
import { ChatCoreModule } from '../chat';
import { MailCoreModule } from '../mail';
import { FUNDRAISING_PAYMENT_PORT } from '../membership-fee';
import { UploadsCoreModule } from '../uploads';
import { AdminProjectsController } from './controllers/admin-projects.controller';
import {
  AdminFundraisingController,
  FundraisingController,
} from './controllers/fundraising.controller';
import { FundraisingRepository } from './repositories/fundraising.repository';
import { FundraisingService } from './services/fundraising.service';
import { FundraisingManualService } from './services/fundraising-manual.service';
import { FundraisingReviewService } from './services/fundraising-review.service';
import { FundraisingSchedulerService } from './services/fundraising-scheduler.service';
import { ProjectSocialController } from './controllers/project-social.controller';
import { ProjectsController } from './controllers/projects.controller';
import { ProjectRepository } from './repositories/project.repository';
import { ProjectAdminRepository } from './repositories/project-admin.repository';
import { ProjectRevisionRepository } from './repositories/project-revision.repository';
import { ProjectSocialRepository } from './repositories/project-social.repository';
import { ProjectWriteRepository } from './repositories/project-write.repository';
import { ProjectAdminService } from './services/project-admin.service';
import { ProjectReadService } from './services/project-read.service';
import { ProjectRevisionService } from './services/project-revision.service';
import { ProjectSocialService } from './services/project-social.service';
import { ProjectWriteService } from './services/project-write.service';
import { ProjectProfileStats } from './services/profile-stats.provider';

const services = [
  ProjectSearchRepository,
  ProjectSearchService,
  ProjectRepository,
  ProjectWriteRepository,
  ProjectSocialRepository,
  ProjectAdminRepository,
  ProjectRevisionRepository,
  ProjectRevisionService,
  ProjectReadService,
  ProjectWriteService,
  ProjectSocialService,
  ProjectAdminService,
  FundraisingRepository,
  FundraisingService,
  FundraisingReviewService,
  FundraisingManualService,
  FundraisingSchedulerService,
];

/** Dự án (B32) — đọc/ghi Portal, tương tác, kiểm duyệt Admin */
@Module({
  imports: [AccountCoreModule, ChatCoreModule, UploadsCoreModule, MailCoreModule],
  providers: [...services, ProjectProfileStats],
  exports: services,
})
export class ProjectCoreModule {}

/**
 * V4-610: cổng đối soát CK Gói Gọi vốn cho membership-fee (global để `ReconcileService` thấy mà
 * membership-fee không import ngược project). Process không nạp module này → cổng null.
 */
@Global()
@Module({
  imports: [ProjectCoreModule],
  providers: [{ provide: FUNDRAISING_PAYMENT_PORT, useExisting: FundraisingReviewService }],
  exports: [FUNDRAISING_PAYMENT_PORT],
})
export class FundraisingPaymentModule {}

@Module({
  imports: [ProjectCoreModule, FundraisingPaymentModule],
  controllers: [
    ProjectsController,
    ProjectSocialController,
    AdminProjectsController,
    FundraisingController,
    AdminFundraisingController,
  ],
})
export class ProjectHttpModule {}
