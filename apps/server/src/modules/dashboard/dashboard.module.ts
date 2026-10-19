import { Module } from '@nestjs/common';
import { DashboardBlocksRepository } from './dashboard-blocks.repository';
import { DashboardController } from './dashboard.controller';
import { DashboardLiveService } from './dashboard-live.service';
import { LiveMetricsService } from './live-metrics.service';

/** Bộ đếm realtime NA-24 — dùng chung api (REST snapshot) + socket (đẩy 3 giây) */
@Module({ providers: [LiveMetricsService], exports: [LiveMetricsService] })
export class DashboardCoreModule {}

@Module({
  imports: [DashboardCoreModule],
  providers: [DashboardLiveService, DashboardBlocksRepository],
  controllers: [DashboardController],
})
export class DashboardHttpModule {}
