import { Controller, Get, Header } from '@nestjs/common';
import { type PriceConfig, priceConfigSchema } from '@opchub/shared';
import { Public } from '@/common/auth';
import { respond } from '@/common/http/zod';
import { PriceConfigService } from '../price-config.service';

/** Bảng giá Portal + câu đồng ý phí ở đăng ký (chưa đăng nhập) — giá luôn mới (E2E-12) */
@Controller('public/price-config')
export class PublicPriceConfigController {
  constructor(private readonly prices: PriceConfigService) {}

  @Public()
  @Get()
  @Header('Cache-Control', 'no-store')
  async get(): Promise<PriceConfig> {
    return respond(priceConfigSchema, await this.prices.current());
  }
}
