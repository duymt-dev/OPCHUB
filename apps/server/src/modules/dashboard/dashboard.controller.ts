import { Controller, Get } from '@nestjs/common';
import { type DashboardLive, dashboardLiveSchema } from '@opchub/shared/api-domains';
import { respond } from '@/common/http/zod';
import { DashboardLiveService } from './dashboard-live.service';

/** Bảng điều khiển Portal (api-contract: đăng nhập + phí) */
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly live: DashboardLiveService) {}

  @Get('live')
  async get(): Promise<DashboardLive> {
    return respond(dashboardLiveSchema, await this.live.live());
  }
}
