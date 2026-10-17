import { Global, Module } from '@nestjs/common';
import { AccountCoreModule, GROUP_JOIN_PORT } from '../account';
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
  ],
  exports: [GROUP_JOIN_PORT],
})
export class CommunityCoreModule {}
