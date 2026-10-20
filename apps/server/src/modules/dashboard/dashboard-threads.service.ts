import { Injectable } from '@nestjs/common';
import { liveThreadSchema } from '@opchub/shared/api-domains';
import { z } from 'zod';
import { DashboardContentCacheService } from './dashboard-content-cache.service';
import { DashboardThreadsRepository } from './dashboard-threads.repository';
import { toThreads } from './dashboard-blocks.mapper';

const threadsSchema = z.array(liveThreadSchema).max(50);

@Injectable()
export class DashboardThreadsService {
  constructor(
    private readonly cache: DashboardContentCacheService,
    private readonly threads: DashboardThreadsRepository,
  ) {}

  list() {
    return this.cache.remember('threads', 10, threadsSchema, async () =>
      toThreads(await this.threads.page()),
    );
  }
}
