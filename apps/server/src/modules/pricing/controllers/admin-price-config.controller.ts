import { Controller, Get, Put, Req } from '@nestjs/common';
import {
  type AdminPriceConfig,
  adminPriceConfigSchema,
  type PriceConfigSave,
  priceConfigSaveSchema,
} from '@opchub/shared';
import type { Request } from 'express';
import { type AccessClaims, CurrentUser, RequireAdmin } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { PriceConfigService } from '../price-config.service';

/** §27 API `GET/PUT /admin/price-config` — Cài đặt › Cấu hình bảng giá (khoá `settings.general`) */
@Controller('admin/price-config')
export class AdminPriceConfigController {
  constructor(private readonly prices: PriceConfigService) {}

  @RequireAdmin('settings.general')
  @Get()
  async get(): Promise<AdminPriceConfig> {
    return respond(adminPriceConfigSchema, await this.prices.admin());
  }

  @RequireAdmin('settings.general')
  @Put()
  async put(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(priceConfigSaveSchema) body: PriceConfigSave,
  ): Promise<AdminPriceConfig> {
    return respond(
      adminPriceConfigSchema,
      await this.prices.save({ id: user.sub, ip: req.ip ?? null }, body),
    );
  }
}
