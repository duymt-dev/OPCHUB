import { Module } from '@nestjs/common';
import { ExportCoreModule } from '@/modules/export';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { AuditLogService } from './services/audit-log.service';
import { AuditLogExportService } from './services/audit-log-export.service';

const providers = [AuditLogRepository, AuditLogService, AuditLogExportService];
/** Loaded by API and worker; no controllers or inverse dependency on export. */
@Module({ imports: [ExportCoreModule], providers, exports: providers })
export class SettingsAuditModule {}
