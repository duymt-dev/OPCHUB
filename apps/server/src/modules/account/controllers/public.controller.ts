import { Controller, Get, Header } from '@nestjs/common';
import {
  type PublicSettings,
  publicSettingsSchema,
  type PublicStats,
  publicStatsSchema,
} from '@opchub/shared/api';
import { Public } from '@/common/auth';
import { respond } from '@/common/http/zod';
import { PublicInfoService } from '../services/public-info.service';

/** Cấu hình + số liệu công khai cho màn Auth (A-11, D-38) */
@Controller('public')
export class PublicController {
  constructor(private readonly info: PublicInfoService) {}

  @Public()
  @Get('settings')
  @Header('Cache-Control', 'no-store')
  async settings(): Promise<PublicSettings> {
    return respond(publicSettingsSchema, await this.info.settings());
  }

  @Public()
  @Get('stats')
  @Header('Cache-Control', 'public, max-age=60')
  async stats(): Promise<PublicStats> {
    return respond(publicStatsSchema, await this.info.stats());
  }
}
