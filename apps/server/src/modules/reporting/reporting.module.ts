import { Module } from '@nestjs/common';
import { ExportCoreModule } from '@/modules/export';
import { OverviewController } from './overview.controller';
import { OverviewFlowRepository } from './overview-flow.repository';
import { OverviewService } from './overview.service';
import { ReportExportService } from './report-export.service';
import { ReportMetricsRepository } from './report-metrics.repository';
import { ReportsController } from './reports.controller';
import { StatsDailyService } from './stats-daily.service';

const providers = [
  OverviewService,
  OverviewFlowRepository,
  StatsDailyService,
  ReportMetricsRepository,
  ReportExportService,
];

/** Dùng chung: api (Tổng quan, Báo cáo) + worker (chụp số liệu hằng ngày, dựng CSV báo cáo) */
@Module({ imports: [ExportCoreModule], providers, exports: providers })
export class ReportingCoreModule {}

@Module({ imports: [ReportingCoreModule], controllers: [OverviewController, ReportsController] })
export class ReportingHttpModule {}
