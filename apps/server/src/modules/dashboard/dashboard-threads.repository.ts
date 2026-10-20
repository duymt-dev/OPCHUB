import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { ThreadRow } from './dashboard-blocks.repository';
import { dashboardThreadsSql, type ThreadCursor } from './dashboard-thread-sql';

@Injectable()
export class DashboardThreadsRepository {
  constructor(private readonly prisma: PrismaService) {}

  page(before?: ThreadCursor): Promise<ThreadRow[]> {
    return this.prisma.db.$queryRaw<ThreadRow[]>(dashboardThreadsSql(before));
  }
}
