import { Global, Module } from '@nestjs/common';
import { GROUP_JOIN_PORT } from '../account';
import { GroupJoinService } from './group-join.service';

/** Domain community — B11 chỉ có cổng tham gia nhóm; B20 thêm nhóm/thành viên/vai trò */
@Global()
@Module({
  providers: [GroupJoinService, { provide: GROUP_JOIN_PORT, useExisting: GroupJoinService }],
  exports: [GROUP_JOIN_PORT],
})
export class CommunityCoreModule {}
