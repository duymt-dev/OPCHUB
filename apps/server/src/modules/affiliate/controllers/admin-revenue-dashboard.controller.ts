import { Controller, Get } from '@nestjs/common';
import type { z } from 'zod';
import {
  revenueDashboardSchema,
  revenueDashboardQuerySchema,
  revenueFormerQuerySchema,
  revenueFormerSchema,
  revenueRetainedSchema,
} from '@opchub/shared/api-domains';
import { RequireAdmin } from '@/common/auth';
import { respond, ZodQuery } from '@/common/http/zod';
import { RevenueDashboardService } from '../services/revenue-dashboard.service';

@Controller('admin/affiliate/revenue')
export class AdminRevenueDashboardController {
  constructor(private readonly service: RevenueDashboardService) {}

  @Get('retained')
  @RequireAdmin('affiliate.view')
  async retained() {
    return respond(revenueRetainedSchema, await this.service.retained());
  }

  @Get('dashboard')
  @RequireAdmin('affiliate.view')
  async dashboard(
    @ZodQuery(revenueDashboardQuerySchema) q: z.infer<typeof revenueDashboardQuerySchema>,
  ) {
    return respond(revenueDashboardSchema, await this.service.dashboard(q.q));
  }

  @Get('former')
  @RequireAdmin('affiliate.view')
  async former(@ZodQuery(revenueFormerQuerySchema) q: z.infer<typeof revenueFormerQuerySchema>) {
    return respond(revenueFormerSchema, await this.service.former(q));
  }
}
