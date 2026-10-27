import { Global, Module } from '@nestjs/common';
import { AdminPriceConfigController } from './controllers/admin-price-config.controller';
import { PublicPriceConfigController } from './controllers/public-price-config.controller';
import { PriceConfigRepository } from './price-config.repository';
import { PriceConfigService } from './price-config.service';

/** Đọc giá cho mọi domain ở cả api, socket, worker (D-94 5A) */
@Global()
@Module({
  providers: [PriceConfigRepository, PriceConfigService],
  exports: [PriceConfigService],
})
export class PricingCoreModule {}

/** Admin + Portal REST — process api */
@Module({
  imports: [PricingCoreModule],
  controllers: [AdminPriceConfigController, PublicPriceConfigController],
})
export class PricingHttpModule {}
