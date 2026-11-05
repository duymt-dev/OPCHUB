import { GroupSearchRepository } from './repositories/group-search.query';
import { GroupSearchService } from './services/group-search.service';
import { GroupTargetsRepository } from './repositories/group-targets.repository';
import { GroupTargetsService } from './services/group-targets.service';
import { ExportCoreModule } from '@/modules/export';
import { Global, Module } from '@nestjs/common';
import { GROUP_ROLE_PORT } from '@/common/auth/group-role.port';
import { AccountCoreModule, GROUP_ASSIGN_PORT, GROUP_JOIN_PORT } from '../account';
import { UploadsCoreModule } from '../uploads';
import { AdminGroupsController } from './controllers/admin-groups.controller';
import { GroupsController } from './controllers/groups.controller';
import { GroupRepository } from './repositories/group.repository';
import { GroupAdminRepository } from './repositories/group-admin.repository';
import { GroupService } from './services/group.service';
import { GroupAccessService } from './services/group-access.service';
import { GroupAdminService } from './services/group-admin.service';
import { GroupAssignService } from './services/group-assign.service';
import { GroupJoinService } from './services/group-join.service';
import { GroupLockEffects } from './services/group-lock.effects';
import { GroupRoleService } from './services/group-role.service';
import { GroupEventsHandler } from './services/group-events.handler';
import { GroupTopicsRepository } from './repositories/group-topics.repository';
import { GroupTopicsService } from './services/group-topics.service';
import { CommunityProfileStats } from './services/profile-stats.provider';

const services = [
  GroupSearchRepository,
  GroupSearchService,
  GroupTargetsRepository,
  GroupTargetsService,
  GroupRepository,
  GroupAdminRepository,
  GroupService,
  GroupAdminService,
  GroupRoleService,
  GroupAccessService,
  GroupEventsHandler,
  GroupTopicsRepository,
  GroupTopicsService,
];

/**
 * Service + repository + cổng cho account; `GROUP_ROLE_PORT` cho GroupRoleGuard (D-43) —
 * Global nên AuthGuardsModule thấy được. Dùng cho cả api, socket, worker.
 */
@Global()
@Module({
  imports: [AccountCoreModule, ExportCoreModule, UploadsCoreModule],
  providers: [
    ...services,
    GroupJoinService,
    { provide: GROUP_JOIN_PORT, useExisting: GroupJoinService },
    CommunityProfileStats,
    GroupLockEffects,
    GroupAssignService,
    { provide: GROUP_ASSIGN_PORT, useExisting: GroupAssignService },
    { provide: GROUP_ROLE_PORT, useExisting: GroupRoleService },
  ],
  exports: [...services, GROUP_JOIN_PORT, GROUP_ASSIGN_PORT, GROUP_ROLE_PORT],
})
export class CommunityCoreModule {}

/** REST của community — process api */
@Module({
  imports: [CommunityCoreModule],
  controllers: [GroupsController, AdminGroupsController],
})
export class CommunityHttpModule {}
