import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { storeSitemapQuerySchema } from '@opchub/shared/api-domains';
import type { z } from 'zod';
import { Public } from '@/common/auth';
import { ZodQuery } from '@/common/http/zod';
import { StoreSitemapService } from '../services/store-sitemap.service';

@Public()
@Controller('public/stores-sitemap')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class StoreSitemapController {
  constructor(private readonly sitemap: StoreSitemapService) {}
  @Get()
  page(@ZodQuery(storeSitemapQuerySchema) query: z.infer<typeof storeSitemapQuerySchema>) {
    return this.sitemap.page(query.cursor);
  }
}
