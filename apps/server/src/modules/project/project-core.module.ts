import { Module } from '@nestjs/common';
import { AccountCoreModule } from '../account';
import { ChatCoreModule } from '../chat';
import { UploadsCoreModule } from '../uploads';
import { AdminProjectsController } from './controllers/admin-projects.controller';
import { ProjectSocialController } from './controllers/project-social.controller';
import { ProjectsController } from './controllers/projects.controller';
import { ProjectRepository } from './repositories/project.repository';
import { ProjectAdminRepository } from './repositories/project-admin.repository';
import { ProjectSocialRepository } from './repositories/project-social.repository';
import { ProjectWriteRepository } from './repositories/project-write.repository';
import { ProjectAdminService } from './services/project-admin.service';
import { ProjectReadService } from './services/project-read.service';
import { ProjectSocialService } from './services/project-social.service';
import { ProjectWriteService } from './services/project-write.service';
import { ProjectProfileStats } from './services/profile-stats.provider';

const services = [
  ProjectRepository,
  ProjectWriteRepository,
  ProjectSocialRepository,
  ProjectAdminRepository,
  ProjectReadService,
  ProjectWriteService,
  ProjectSocialService,
  ProjectAdminService,
];

/** Dự án (B32) — đọc/ghi Portal, tương tác, kiểm duyệt Admin */
@Module({
  imports: [AccountCoreModule, ChatCoreModule, UploadsCoreModule],
  providers: [...services, ProjectProfileStats],
  exports: services,
})
export class ProjectCoreModule {}

@Module({
  imports: [ProjectCoreModule],
  controllers: [ProjectsController, ProjectSocialController, AdminProjectsController],
})
export class ProjectHttpModule {}
