import { Module } from '@nestjs/common';
import { DashboardBlocksRepository } from './dashboard-blocks.repository';
import { DashboardController } from './dashboard.controller';
import { DashboardLiveService } from './dashboard-live.service';
import { LiveMetricsService } from './live-metrics.service';
import { DashboardContentCacheService } from './dashboard-content-cache.service';
import { DashboardThreadsRepository } from './dashboard-threads.repository';
import { DashboardThreadsService } from './dashboard-threads.service';

/** Bộ đếm realtime NA-24 — dùng chung api (REST snapshot) + socket (đẩy 3 giây) */
@Module({
  providers: [LiveMetricsService, DashboardContentCacheService],
  exports: [LiveMetricsService, DashboardContentCacheService],
})
export class DashboardCoreModule {}

@Module({
  imports: [DashboardCoreModule],
  providers: [
    DashboardLiveService,
    DashboardBlocksRepository,
    DashboardThreadsRepository,
    DashboardThreadsService,
  ],
  controllers: [DashboardController],
})
export class DashboardHttpModule {}
