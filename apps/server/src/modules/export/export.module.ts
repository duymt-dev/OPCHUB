import { Module } from '@nestjs/common';
import { ExportBuilders } from './export-builders';
import { ExportController } from './export.controller';
import { ExportRepository } from './export.repository';
import { ExportService } from './export.service';

const providers = [ExportRepository, ExportService, ExportBuilders];

/** Dùng chung: api (tạo job + xem trạng thái), worker (dựng file) */
@Module({ providers, exports: providers })
export class ExportCoreModule {}

@Module({ imports: [ExportCoreModule], controllers: [ExportController] })
export class ExportHttpModule {}
