import { Module } from '@nestjs/common';
import { ExportCoreModule } from '@/modules/export';
import { OverviewController } from './overview.controller';
import { OverviewFlowRepository } from './overview-flow.repository';
import { OverviewService } from './overview.service';
import { OverviewSeriesRepository } from './overview-series.repository';
import { ReportExportService } from './report-export.service';
import { ReportMetricsRepository } from './report-metrics.repository';
import { ReportsController } from './reports.controller';
import { StatsDailyService } from './stats-daily.service';
import { ConversionRepository } from './conversion.repository';
import { ConversionService } from './conversion.service';
import { ConversionController } from './conversion.controller';

const providers = [
  ConversionRepository,
  ConversionService,
  OverviewService,
  OverviewSeriesRepository,
  OverviewFlowRepository,
  StatsDailyService,
  ReportMetricsRepository,
  ReportExportService,
];

/** Dùng chung: api (Tổng quan, Báo cáo) + worker (chụp số liệu hằng ngày, dựng CSV báo cáo) */
@Module({ imports: [ExportCoreModule], providers, exports: providers })
export class ReportingCoreModule {}

@Module({
  imports: [ReportingCoreModule],
  controllers: [OverviewController, ReportsController, ConversionController],
})
export class ReportingHttpModule {}
