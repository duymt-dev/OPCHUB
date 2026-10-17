import { Module } from '@nestjs/common';
import { OverviewController } from './overview.controller';
import { OverviewService } from './overview.service';
import { StatsDailyService } from './stats-daily.service';

const providers = [OverviewService, StatsDailyService];

/** Dùng chung: api (Tổng quan) + worker (chụp số liệu hằng ngày) */
@Module({ providers, exports: providers })
export class ReportingCoreModule {}

@Module({ imports: [ReportingCoreModule], controllers: [OverviewController] })
export class ReportingHttpModule {}
