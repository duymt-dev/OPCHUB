import { Controller, Get } from '@nestjs/common';
import { auditLogRowSchema } from '@opchub/shared/api-domains';
import { z } from 'zod';
import { RequireAdmin } from '@/common/auth';
import { respond } from '@/common/http/zod';
import { AuditLogService } from '../services/audit-log.service';

const auditListSchema = z.object({ items: z.array(auditLogRowSchema) });

/** Nhật ký hoạt động (`settings.log`); route phân quyền cũ đã xoá ở TIP-V2-204 (→ 404) */
@Controller('admin')
export class RolesController {
  constructor(private readonly audit: AuditLogService) {}

  @RequireAdmin('settings.log')
  @Get('audit-logs')
  async auditLogs(): Promise<z.infer<typeof auditListSchema>> {
    return respond(auditListSchema, await this.audit.recent());
  }
}
