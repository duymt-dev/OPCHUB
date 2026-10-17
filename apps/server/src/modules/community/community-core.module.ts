import { Global, Module } from '@nestjs/common';
import { AccountCoreModule, GROUP_ASSIGN_PORT, GROUP_JOIN_PORT } from '../account';
import { GroupAssignService } from './group-assign.service';
import { GroupJoinService } from './group-join.service';
import { CommunityProfileStats } from './profile-stats.provider';

/** Domain community — B11 chỉ có cổng tham gia nhóm; B20 thêm nhóm/thành viên/vai trò */
@Global()
@Module({
  imports: [AccountCoreModule],
  providers: [
    GroupJoinService,
    { provide: GROUP_JOIN_PORT, useExisting: GroupJoinService },
    CommunityProfileStats,
    GroupAssignService,
    { provide: GROUP_ASSIGN_PORT, useExisting: GroupAssignService },
  ],
  exports: [GROUP_JOIN_PORT, GROUP_ASSIGN_PORT],
})
export class CommunityCoreModule {}
