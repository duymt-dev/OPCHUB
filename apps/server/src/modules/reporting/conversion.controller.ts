import { Controller, Get, HttpCode, Ip, Post } from '@nestjs/common';
import { adminConversionSchema, csvFileSchema } from '@opchub/shared/api-domains';
import { CurrentUser, RequireAdmin, type AccessClaims } from '@/common/auth';
import { respond } from '@/common/http/zod';
import { ConversionService } from './conversion.service';

@Controller('admin/overview/conversion')
export class ConversionController {
  constructor(private readonly conversion: ConversionService) {}
  @Get()
  @RequireAdmin('overview.view')
  async get() {
    return respond(adminConversionSchema, await this.conversion.get());
  }

  @Post('export')
  @HttpCode(200)
  @RequireAdmin('overview.view')
  async export(@CurrentUser() actor: AccessClaims, @Ip() ip: string) {
    return respond(csvFileSchema, await this.conversion.export({ id: actor.sub, ip }));
  }
}
